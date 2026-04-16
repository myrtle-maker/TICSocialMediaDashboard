import { NextRequest, NextResponse } from "next/server";
import { sendToWebhook, testBlocks } from "@/lib/slack";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl } = body as { webhookUrl?: string };

    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "A valid Slack webhook URL (https://hooks.slack.com/...) is required" },
        { status: 400 }
      );
    }

    await sendToWebhook(webhookUrl, testBlocks());
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
