import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startActorRun } from "@/lib/apify/rest";
import { ACTOR_CONFIGS } from "@/lib/apify/actors";
import type { Platform } from "@/types/social";

function extractHandle(rawHandle: string): string {
  let handle = rawHandle.trim();
  try {
    if (handle.startsWith("http")) {
      const url = new URL(handle);
      handle = url.pathname;
    }
  } catch {}
  handle = handle.replace(/^\/+|\/+$/g, "");
  handle = handle.replace(/^company\//i, "").replace(/^channel\//i, "").replace(/^@/, "");
  if (handle.includes("/")) handle = handle.split("/")[0];
  return handle;
}

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

    // Get Apify token from settings
    const tokenSetting = await prisma.setting.findUnique({
      where: { key: "apifyApiToken" },
    });
    if (!tokenSetting?.value) {
      return NextResponse.json(
        { error: "Apify API token not configured" },
        { status: 400 }
      );
    }
    const token = tokenSetting.value;

    // Get posts per scrape setting
    const ppsSetting = await prisma.setting.findUnique({
      where: { key: "postsPerScrape" },
    });
    const maxPosts = parseInt(ppsSetting?.value ?? "50") || 50;

    // Fetch all accounts
    const accounts = await prisma.account.findMany();
    if (accounts.length === 0) {
      return NextResponse.json({ success: true, jobsStarted: 0, accounts: 0, message: "No accounts to scrape" });
    }

    let jobsStarted = 0;

    for (const account of accounts) {
      const platform = account.platform as Platform;
      const config = ACTOR_CONFIGS[platform];
      if (!config) continue;

      try {
        const cleanHandle = extractHandle(account.handle);
        const input = config.buildInput(cleanHandle, maxPosts);

        const run = await startActorRun(token, config.actorId, input);

        await prisma.scrapeJob.create({
          data: {
            platform,
            accountId: account.id,
            apifyRunId: run.runId,
            apifyActorId: config.actorId,
            status: "running",
          },
        });

        jobsStarted++;
      } catch (err) {
        console.error(`[cron/scrape] Failed for @${account.handle} on ${platform}:`, err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({
      success: true,
      jobsStarted,
      accounts: accounts.length,
    });
  } catch (err) {
    console.error("[cron/scrape] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron scrape failed" },
      { status: 500 }
    );
  }
}
