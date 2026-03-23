import { NextResponse } from "next/server";
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

export async function POST() {
  try {
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

    const competitors = await prisma.competitor.findMany();

    if (competitors.length === 0) {
      return NextResponse.json({ error: "No competitors found to scrape" }, { status: 400 });
    }

    const results: { competitorId: string; handle: string; platform: string; status: string; runId?: string; error?: string }[] = [];

    for (const competitor of competitors) {
      const platform = competitor.platform as Platform;
      const config = ACTOR_CONFIGS[platform];

      if (!config) {
        results.push({ competitorId: competitor.id, handle: competitor.handle, platform, status: "skipped", error: `No actor config for: ${platform}` });
        continue;
      }

      try {
        const cleanHandle = extractHandle(competitor.handle);
        const input = config.buildInput(cleanHandle, maxPosts);

        const run = await startActorRun(token, config.actorId, input);

        // Store the run info in a ScrapeJob, using competitorId in the accountId field
        // We prefix with "competitor:" to distinguish from regular account scrapes
        await prisma.scrapeJob.create({
          data: {
            platform,
            accountId: `competitor:${competitor.id}`,
            apifyRunId: run.runId,
            apifyActorId: config.actorId,
            status: "running",
          },
        });

        results.push({ competitorId: competitor.id, handle: cleanHandle, platform, status: "started", runId: run.runId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to start competitor scrape for @${competitor.handle} on ${platform}:`, msg);
        results.push({ competitorId: competitor.id, handle: competitor.handle, platform, status: "failed", error: msg });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Competitor scrape jobs started. Results will appear once actors finish (usually 1-3 minutes).",
      totalCompetitors: competitors.length,
      results,
    });
  } catch (err) {
    console.error("Competitor scrape endpoint error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Scrape failed" }, { status: 500 });
  }
}
