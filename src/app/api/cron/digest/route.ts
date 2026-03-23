import { NextRequest, NextResponse } from "next/server";
import { sendDigest } from "@/app/api/email/digest/route";

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

    const result = await sendDigest();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[cron/digest] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Digest cron failed",
      },
      { status: 500 }
    );
  }
}
