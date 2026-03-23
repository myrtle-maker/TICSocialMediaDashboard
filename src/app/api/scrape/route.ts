import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApifyClient } from "apify-client";
import { ACTOR_CONFIGS } from "@/lib/apify/actors";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, scrapeAll } = body;

    // Get API token from database
    const tokenSetting = await prisma.setting.findUnique({
      where: { key: "apifyApiToken" },
    });

    if (!tokenSetting?.value) {
      return NextResponse.json(
        { error: "Apify API token not configured. Go to Settings to add it." },
        { status: 400 }
      );
    }

    // Get posts-per-scrape setting
    const ppsSetting = await prisma.setting.findUnique({
      where: { key: "postsPerScrape" },
    });
    const maxPosts = parseInt(ppsSetting?.value ?? "50") || 50;

    // Get accounts to scrape
    let accounts;
    if (scrapeAll) {
      accounts = await prisma.account.findMany();
    } else if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      accounts = account ? [account] : [];
    } else {
      return NextResponse.json({ error: "Provide accountId or scrapeAll: true" }, { status: 400 });
    }

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No accounts found to scrape" }, { status: 400 });
    }

    const client = new ApifyClient({ token: tokenSetting.value });
    const results: { accountId: string; handle: string; platform: string; status: string; postsScraped: number; error?: string }[] = [];

    for (const account of accounts) {
      const platform = account.platform as Platform;
      const config = ACTOR_CONFIGS[platform];
      const transformer = transformerMap[platform];

      if (!config || !transformer) {
        results.push({
          accountId: account.id,
          handle: account.handle,
          platform,
          status: "skipped",
          postsScraped: 0,
          error: `No actor config for platform: ${platform}`,
        });
        continue;
      }

      // Create scrape job record
      const job = await prisma.scrapeJob.create({
        data: {
          platform,
          accountId: account.id,
          apifyRunId: "",
          apifyActorId: config.actorId,
          status: "running",
        },
      });

      try {
        // Build input and run actor
        const input = config.buildInput(account.handle, maxPosts);
        const run = await client.actor(config.actorId).call(input, {
          waitSecs: 120, // Wait up to 2 minutes for completion
        });

        // Update job with run ID
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { apifyRunId: run.id },
        });

        // Fetch results
        const dataset = client.dataset(run.defaultDatasetId);
        const { items } = await dataset.listItems({ limit: maxPosts });

        if (items.length === 0) {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: { status: "succeeded", postsScraped: 0, completedAt: new Date() },
          });

          results.push({
            accountId: account.id,
            handle: account.handle,
            platform,
            status: "succeeded",
            postsScraped: 0,
          });
          continue;
        }

        // Transform raw data to unified posts
        const posts = transformer(items as unknown[], account.id);

        // Upsert posts to database
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
                accountId: account.id,
                contentType: post.contentType,
                caption: post.caption,
                hashtags: post.hashtags,
                mentions: post.mentions,
                mediaUrls: post.mediaUrls,
                thumbnailUrl: post.thumbnailUrl,
                permalink: post.permalink,
                hookText: post.hookText,
                hookType: post.hookType,
                hookScore: post.hookScore,
                likes: post.likes,
                comments: post.comments,
                shares: post.shares,
                saves: post.saves,
                views: post.views,
                impressions: post.impressions,
                reach: post.reach,
                engagementRate: post.engagementRate,
                viralityScore: post.viralityScore,
                platformMeta: (post.platformMeta ?? {}) as Record<string, string>,
                publishedAt: post.publishedAt,
              },
            });
            upserted++;
          } catch (postErr) {
            console.error(`Failed to upsert post ${post.platformPostId}:`, postErr);
          }
        }

        // Update account and job
        await prisma.account.update({
          where: { id: account.id },
          data: { lastScrapedAt: new Date(), totalPosts: upserted },
        });

        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: "succeeded", postsScraped: upserted, completedAt: new Date() },
        });

        results.push({
          accountId: account.id,
          handle: account.handle,
          platform,
          status: "succeeded",
          postsScraped: upserted,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Scrape failed for ${account.handle} on ${platform}:`, errorMessage);

        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: "failed", errorMessage, completedAt: new Date() },
        });

        results.push({
          accountId: account.id,
          handle: account.handle,
          platform,
          status: "failed",
          postsScraped: 0,
          error: errorMessage,
        });
      }
    }

    const totalScraped = results.reduce((s, r) => s + r.postsScraped, 0);

    return NextResponse.json({
      success: true,
      totalAccounts: accounts.length,
      totalPostsScraped: totalScraped,
      results,
    });
  } catch (err) {
    console.error("Scrape endpoint error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 }
    );
  }
}
