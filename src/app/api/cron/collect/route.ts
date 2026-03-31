import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRunStatus, getDatasetItems } from "@/lib/apify/rest";
import {
  transformTikTok,
  transformInstagram,
  transformYouTube,
  transformTwitter,
  transformFacebook,
  transformLinkedIn,
} from "@/lib/transformers";
import type { Platform, SocialPost } from "@/types/social";

const transformerMap: Record<Platform, (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[]> = {
  tiktok: transformTikTok as (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[],
  instagram: transformInstagram as (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[],
  youtube: transformYouTube as (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[],
  twitter: transformTwitter as (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[],
  facebook: transformFacebook as (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[],
  linkedin: transformLinkedIn as (raw: unknown[], accountId: string, avgRate?: number) => SocialPost[],
};

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if set)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get Apify token
    const tokenSetting = await prisma.setting.findUnique({
      where: { key: "apifyApiToken" },
    });
    if (!tokenSetting?.value) {
      return NextResponse.json({ error: "No API token" }, { status: 400 });
    }
    const token = tokenSetting.value;

    const runningJobs = await prisma.scrapeJob.findMany({
      where: { status: "running" },
    });

    if (runningJobs.length === 0) {
      return NextResponse.json({ success: true, message: "No running jobs to collect", collected: 0 });
    }

    let totalCollected = 0;
    const results: { jobId: string; platform: string; status: string; postsCollected: number }[] = [];

    for (const job of runningJobs) {
      try {
        const run = await getRunStatus(token, job.apifyRunId);

        if (run.status === "RUNNING" || run.status === "READY") {
          results.push({ jobId: job.id, platform: job.platform, status: "still_running", postsCollected: 0 });
          continue;
        }

        if (run.status !== "SUCCEEDED") {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: { status: "failed", errorMessage: `Actor run status: ${run.status}`, completedAt: new Date() },
          });
          results.push({ jobId: job.id, platform: job.platform, status: run.status, postsCollected: 0 });
          continue;
        }

        const items = await getDatasetItems(token, run.datasetId, 100);
        const platform = job.platform as Platform;
        const transformer = transformerMap[platform];

        if (!transformer || items.length === 0) {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: { status: "succeeded", postsScraped: 0, completedAt: new Date() },
          });
          results.push({ jobId: job.id, platform: job.platform, status: "succeeded", postsCollected: 0 });
          continue;
        }

        // Compute account's current avg ER so hook scores are relative, not all 50
        const erAgg = await prisma.post.aggregate({
          where: { accountId: job.accountId, engagementRate: { gt: 0 } },
          _avg: { engagementRate: true },
        });
        const avgEngagementRate = erAgg._avg.engagementRate ?? undefined;

        const posts = transformer(items as unknown[], job.accountId, avgEngagementRate);
        let upserted = 0;

        for (const post of posts) {
          try {
            await prisma.post.upsert({
              where: {
                platform_platformPostId: {
                  platform: post.platform,
                  platformPostId: post.platformPostId,
                },
              },
              update: {
                likes: post.likes,
                comments: post.comments,
                shares: post.shares,
                saves: post.saves,
                views: post.views,
                engagementRate: post.engagementRate,
                viralityScore: post.viralityScore,
                hookScore: post.hookScore,
                // Refresh media URLs on every scrape — CDN tokens (Instagram, TikTok) expire
                ...(post.thumbnailUrl && { thumbnailUrl: post.thumbnailUrl }),
                ...(post.mediaUrls?.length && { mediaUrls: post.mediaUrls }),
                scrapedAt: new Date(),
              },
              create: {
                platformPostId: post.platformPostId,
                platform: post.platform,
                accountId: job.accountId,
                contentType: post.contentType,
                caption: post.caption || "",
                hashtags: post.hashtags || [],
                mentions: post.mentions || [],
                mediaUrls: post.mediaUrls || [],
                thumbnailUrl: post.thumbnailUrl,
                permalink: post.permalink || "",
                hookText: post.hookText || "",
                hookType: post.hookType || "other",
                hookScore: post.hookScore || 0,
                likes: post.likes || 0,
                comments: post.comments || 0,
                shares: post.shares || 0,
                saves: post.saves || 0,
                views: post.views || 0,
                impressions: post.impressions,
                reach: post.reach,
                engagementRate: post.engagementRate || 0,
                viralityScore: post.viralityScore || 0,
                platformMeta: (post.platformMeta ?? {}) as Record<string, string>,
                publishedAt: post.publishedAt || new Date(),
              },
            });
            upserted++;
          } catch (postErr) {
            console.error(`[cron/collect] Failed to upsert post:`, postErr);
          }
        }

        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: "succeeded", postsScraped: upserted, completedAt: new Date() },
        });

        await prisma.account.update({
          where: { id: job.accountId },
          data: { lastScrapedAt: new Date(), totalPosts: upserted },
        });

        totalCollected += upserted;
        results.push({ jobId: job.id, platform: job.platform, status: "collected", postsCollected: upserted });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/collect] Failed to collect job ${job.id}:`, msg);
        results.push({ jobId: job.id, platform: job.platform, status: "error", postsCollected: 0 });
      }
    }

    return NextResponse.json({ success: true, totalCollected, results });
  } catch (err) {
    console.error("[cron/collect] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron collect failed" },
      { status: 500 }
    );
  }
}
