import { NextRequest, NextResponse } from "next/server";
import { sendAlerts } from "@/app/api/email/alerts/route";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await sendAlerts();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/alerts] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Alerts cron failed" },
      { status: 500 }
    );
  }
}
