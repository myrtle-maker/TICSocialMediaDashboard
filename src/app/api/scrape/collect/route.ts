import { NextResponse } from "next/server";
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

export async function POST() {
  try {
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
      return NextResponse.json({ message: "No running jobs to collect", collected: 0, results: [] });
    }

    const results: { jobId: string; platform: string; status: string; postsCollected: number; error?: string }[] = [];

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

        // Fetch all items from the dataset — don't cap by postsPerScrape since
        // multi-URL actors (e.g. YouTube /videos + /shorts) produce more items
        // than the per-URL limit.
        const items = await getDatasetItems(token, run.datasetId, 1000);

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

        // Transform and upsert
        const posts = transformer(items as unknown[], job.accountId);
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
            console.error(`Failed to upsert post:`, postErr);
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

        results.push({ jobId: job.id, platform: job.platform, status: "collected", postsCollected: upserted });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to collect job ${job.id}:`, msg);
        results.push({ jobId: job.id, platform: job.platform, status: "error", postsCollected: 0, error: msg });
      }
    }

    const totalCollected = results.reduce((s, r) => s + r.postsCollected, 0);

    return NextResponse.json({ success: true, totalCollected, results });
  } catch (err) {
    console.error("Collect endpoint error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Collection failed" }, { status: 500 });
  }
}
