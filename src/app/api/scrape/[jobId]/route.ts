import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // In production, this would check Apify run status
  return NextResponse.json({
    jobId,
    status: "succeeded",
    postsScraped: 0,
    message: "This is a mock response. Configure APIFY_API_TOKEN for live scraping.",
  });
}
