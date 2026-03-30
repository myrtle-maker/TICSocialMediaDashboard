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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, scrapeAll } = body;

    const tokenSetting = await prisma.setting.findUnique({
      where: { key: "apifyApiToken" },
    });
    if (!tokenSetting?.value) {
      return NextResponse.json(
        { error: "Apify API token not configured. Go to Settings to add it." },
        { status: 400 }
      );
    }
    const token = tokenSetting.value;

    const ppsSetting = await prisma.setting.findUnique({
      where: { key: "postsPerScrape" },
    });
    const maxPosts = parseInt(ppsSetting?.value ?? "50") || 50;

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

    // Abandon any previously-running jobs for these accounts so collect
    // doesn't re-process stale Apify runs from earlier scrapes.
    const accountIds = accounts.map((a) => a.id);
    await prisma.scrapeJob.updateMany({
      where: { accountId: { in: accountIds }, status: "running" },
      data: { status: "abandoned", completedAt: new Date() },
    });

    const results: { accountId: string; handle: string; platform: string; status: string; runId?: string; error?: string }[] = [];

    for (const account of accounts) {
      const platform = account.platform as Platform;
      const config = ACTOR_CONFIGS[platform];

      if (!config) {
        results.push({ accountId: account.id, handle: account.handle, platform, status: "skipped", error: `No actor config for: ${platform}` });
        continue;
      }

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

        results.push({ accountId: account.id, handle: cleanHandle, platform, status: "started", runId: run.runId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to start scrape for @${account.handle} on ${platform}:`, msg);
        results.push({ accountId: account.id, handle: account.handle, platform, status: "failed", error: msg });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Scrape jobs started. Results will appear on the dashboard once actors finish running (usually 1-3 minutes).",
      totalAccounts: accounts.length,
      results,
    });
  } catch (err) {
    console.error("Scrape endpoint error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Scrape failed" }, { status: 500 });
  }
}
