import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { notify, performanceAlertBlocks } from "@/lib/slack";
import { inAppNotify } from "@/lib/in-app-notify";

// ---------------------------------------------------------------------------
// Performance alert logic — exported for cron reuse
// ---------------------------------------------------------------------------

export async function sendAlerts(): Promise<{ sent: number; errors: string[]; checked: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: 0, errors: ["RESEND_API_KEY not configured"], checked: 0 };
  }

  const subscribers = await prisma.emailSubscriber.findMany({ where: { active: true } });
  if (subscribers.length === 0) {
    return { sent: 0, errors: [], checked: 0 };
  }

  const resend = new Resend(apiKey);

  // Look at posts published in the last 48 hours
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const recentPosts = await prisma.post.findMany({
    where: { publishedAt: { gte: cutoff }, engagementRate: { gt: 0 } },
    select: {
      id: true,
      platform: true,
      caption: true,
      engagementRate: true,
      views: true,
      likes: true,
      comments: true,
      publishedAt: true,
      permalink: true,
      accountId: true,
      alerts: { select: { alertType: true } },
    },
  });

  if (recentPosts.length === 0) {
    return { sent: 0, errors: [], checked: 0 };
  }

  // Compute per-account average ER (exclude the recent posts themselves)
  const accountIds = [...new Set(recentPosts.map((p) => p.accountId))];
  const accountAvgs: Record<string, number> = {};

  for (const accountId of accountIds) {
    const agg = await prisma.post.aggregate({
      where: {
        accountId,
        engagementRate: { gt: 0 },
        publishedAt: { lt: cutoff },
      },
      _avg: { engagementRate: true },
    });
    accountAvgs[accountId] = agg._avg.engagementRate ?? 0;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const alerts: { post: (typeof recentPosts)[0]; type: "overperforming" | "underperforming" }[] = [];

  for (const post of recentPosts) {
    const avgER = accountAvgs[post.accountId] ?? 0;
    if (avgER === 0) continue;

    const ratio = post.engagementRate / avgER;
    const existingTypes = post.alerts.map((a) => a.alertType);

    if (ratio >= 2 && !existingTypes.includes("overperforming")) {
      alerts.push({ post, type: "overperforming" });
    } else if (ratio <= 0.5 && !existingTypes.includes("underperforming")) {
      alerts.push({ post, type: "underperforming" });
    }
  }

  if (alerts.length === 0) {
    return { sent: 0, errors: [], checked: recentPosts.length };
  }

  // Record the alerts so we don't re-send
  for (const { post, type } of alerts) {
    await prisma.performanceAlert.create({
      data: { postId: post.id, alertType: type },
    }).catch(() => {
      // ignore duplicate constraint — another process may have already recorded it
    });
  }

  // Build and send one email per subscriber
  const subject = `TIC Social Insights — ${alerts.length} Performance Alert${alerts.length !== 1 ? "s" : ""}`;
  const html = buildAlertHtml(alerts, appUrl);

  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscribers) {
    try {
      await resend.emails.send({
        from: "TIC Social Insights <onboarding@resend.dev>",
        to: sub.email,
        subject,
        html,
      });
      sent++;
    } catch (err) {
      errors.push(`${sub.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Send Slack notification alongside emails
  const overCount = alerts.filter((a) => a.type === "overperforming").length;
  const underCount = alerts.filter((a) => a.type === "underperforming").length;
  notify("performanceAlert", performanceAlertBlocks(alerts.length, overCount, underCount));
  const parts = [
    overCount > 0 ? `${overCount} overperforming` : null,
    underCount > 0 ? `${underCount} underperforming` : null,
  ].filter(Boolean).join(", ");
  inAppNotify("performanceAlert", "Performance alert", `${alerts.length} post${alerts.length !== 1 ? "s" : ""} flagged — ${parts}`, "/content");

  return { sent, errors, checked: recentPosts.length };
}

// ---------------------------------------------------------------------------
// POST handler — manual trigger
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const result = await sendAlerts();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[email/alerts] Error:", err);
    return NextResponse.json(
      { sent: 0, errors: [err instanceof Error ? err.message : "Alert send failed"], checked: 0 },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// HTML builder
// ---------------------------------------------------------------------------

type AlertPost = {
  platform: string;
  caption: string;
  engagementRate: number;
  views: number;
  likes: number;
  comments: number;
  publishedAt: Date;
  permalink: string;
};

function buildAlertHtml(
  alerts: { post: AlertPost; type: "overperforming" | "underperforming" }[],
  appUrl: string
): string {
  const rows = alerts
    .map(({ post, type }) => {
      const isOver = type === "overperforming";
      const badgeColor = isOver ? "#10b981" : "#ef4444";
      const badgeLabel = isOver ? "Overperforming" : "Underperforming";
      const caption =
        post.caption.length > 120 ? post.caption.slice(0, 120) + "..." : post.caption;
      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #e4e4e7;">
            <div style="margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: ${badgeColor}; color: #fff; font-size: 11px; font-weight: 600;">${badgeLabel}</span>
              <span style="font-size: 12px; color: #a1a1aa;">${post.platform.toUpperCase()}</span>
            </div>
            <div style="font-size: 14px; color: #18181b; line-height: 1.5; margin-bottom: 6px;">${caption}</div>
            <div style="font-size: 12px; color: #71717a;">
              ER: ${(post.engagementRate * 100).toFixed(2)}% &middot; Views: ${post.views.toLocaleString()} &middot; Likes: ${post.likes.toLocaleString()}
              ${post.permalink ? ` &middot; <a href="${post.permalink}" style="color: #3b82f6; text-decoration: none;">View post</a>` : ""}
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color: #18181b; padding: 24px 32px;">
            <div style="font-size: 20px; font-weight: 700; color: #ffffff;">TIC Social Insights</div>
            <div style="font-size: 13px; color: #a1a1aa; margin-top: 4px;">Performance Alert</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 32px 0;">
            <div style="font-size: 16px; font-weight: 700; color: #18181b; margin-bottom: 8px;">
              ${alerts.length} post${alerts.length !== 1 ? "s" : ""} flagged in the last 48 hours
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px; text-align: center;">
            <a href="${appUrl}" style="display: inline-block; padding: 12px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View Dashboard</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center;">
            <div style="font-size: 12px; color: #a1a1aa;">
              You're receiving this because you're subscribed to TIC Social Insights alerts.<br/>
              <a href="${appUrl}/settings" style="color: #71717a; text-decoration: underline;">Manage preferences</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
