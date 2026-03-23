import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { platform, accountHandle } = body;

  if (!platform || !accountHandle) {
    return NextResponse.json(
      { error: "platform and accountHandle are required" },
      { status: 400 }
    );
  }

  // In production, this would trigger an Apify actor run
  // For now, return a mock job ID
  const jobId = `job-${Date.now()}`;

  return NextResponse.json({
    jobId,
    status: "pending",
    message: `Scrape job queued for @${accountHandle} on ${platform}. Configure your APIFY_API_TOKEN in .env.local to enable live scraping.`,
  });
}
