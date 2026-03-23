import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApifyClient } from "apify-client";
import { ACTOR_CONFIGS } from "@/lib/apify/actors";
import type { Platform } from "@/types/social";

/**
 * Extract a clean username/handle from a full URL or @-prefixed string.
 */
function extractHandle(rawHandle: string, platform: Platform): string {
  let handle = rawHandle.trim();

  // Strip full URLs down to the path segment
  try {
    if (handle.startsWith("http")) {
      const url = new URL(handle);
      handle = url.pathname;
    }
  } catch {
    // not a URL, use as-is
  }

  // Remove leading/trailing slashes
  handle = handle.replace(/^\/+|\/+$/g, "");

  // Remove platform-specific path prefixes
  handle = handle
    .replace(/^company\//i, "") // LinkedIn
    .replace(/^@/, "");         // @username

  // If there are remaining path segments (e.g. "user/videos"), take the first one
  if (handle.includes("/")) {
    handle = handle.split("/")[0];
  }

  return handle;
}

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
    const results: { accountId: string; handle: string; platform: string; status: string; runId?: string; error?: string }[] = [];

    // Start all scrapes asynchronously (don't wait for completion)
    for (const account of accounts) {
      const platform = account.platform as Platform;
      const config = ACTOR_CONFIGS[platform];

      if (!config) {
        results.push({
          accountId: account.id,
          handle: account.handle,
          platform,
          status: "skipped",
          error: `No actor config for platform: ${platform}`,
        });
        continue;
      }

      try {
        const cleanHandle = extractHandle(account.handle, platform);
        const input = config.buildInput(cleanHandle, maxPosts);

        // Start the actor run WITHOUT waiting for completion
        const run = await client.actor(config.actorId).start(input);

        // Save scrape job to database
        await prisma.scrapeJob.create({
          data: {
            platform,
            accountId: account.id,
            apifyRunId: run.id,
            apifyActorId: config.actorId,
            status: "running",
          },
        });

        results.push({
          accountId: account.id,
          handle: cleanHandle,
          platform,
          status: "started",
          runId: run.id,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Failed to start scrape for ${account.handle} on ${platform}:`, errorMessage);

        results.push({
          accountId: account.id,
          handle: account.handle,
          platform,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Scrape jobs started. Results will appear on the dashboard once actors finish running. This may take a few minutes.",
      totalAccounts: accounts.length,
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
