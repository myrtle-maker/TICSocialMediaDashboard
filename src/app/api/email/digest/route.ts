import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getAnalyticsContext } from "@/lib/analytics/context";

// ---------------------------------------------------------------------------
// Shared digest logic – exported so the cron handler can call it directly
// ---------------------------------------------------------------------------

export async function sendDigest(): Promise<{
  sent: number;
  errors: string[];
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: 0, errors: ["RESEND_API_KEY not configured"] };
  }

  const resend = new Resend(apiKey);

  // Get active subscribers
  const subscribers = await prisma.emailSubscriber.findMany({
    where: { active: true },
  });

  if (subscribers.length === 0) {
    return { sent: 0, errors: [] };
  }

  // Check for posts in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentPostCount = await prisma.post.count({
    where: { publishedAt: { gte: sevenDaysAgo } },
  });

  if (recentPostCount === 0) {
    return { sent: 0, errors: [] };
  }

  // Get analytics context
  const ctx = await getAnalyticsContext();

  // Build date range for subject
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateRange = `${fmt(weekAgo)}-${fmt(now)}`;

  // Compute totals
  const totalEngagement = ctx.topPosts.reduce(
    (s, p) => s + p.likes + p.comments + p.shares + p.saves,
    0
  );
  const avgER =
    ctx.platformStats.length > 0
      ? ctx.platformStats.reduce((s, p) => s + p.avgEngagementRate, 0) /
        ctx.platformStats.length
      : 0;
  const topPlatform =
    ctx.platformStats.length > 0
      ? [...ctx.platformStats].sort(
          (a, b) => b.avgEngagementRate - a.avgEngagementRate
        )[0].label
      : "N/A";

  // Dashboard URL
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  // Top 3 posts
  const top3Posts = ctx.topPosts.slice(0, 3);

  // Top 3 insights
  const top3Insights = ctx.topInsights.slice(0, 3);

  const subject = `TIC Social Insights - Weekly Digest (${dateRange})`;

  const html = buildEmailHtml({
    dateRange,
    postCount: ctx.summary.postCount,
    totalEngagement,
    avgER,
    topPlatform,
    top3Posts,
    top3Insights,
    appUrl,
  });

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
      const msg =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`${sub.email}: ${msg}`);
    }
  }

  return { sent, errors };
}

// ---------------------------------------------------------------------------
// POST handler – manual trigger
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const result = await sendDigest();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[email/digest] Error:", err);
    return NextResponse.json(
      {
        sent: 0,
        errors: [err instanceof Error ? err.message : "Digest send failed"],
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// HTML builder
// ---------------------------------------------------------------------------

interface EmailData {
  dateRange: string;
  postCount: number;
  totalEngagement: number;
  avgER: number;
  topPlatform: string;
  top3Posts: {
    caption: string;
    platform: string;
    engagementRate: number;
    views: number;
  }[];
  top3Insights: {
    title: string;
    description: string;
    category: string;
  }[];
  appUrl: string;
}

function buildEmailHtml(data: EmailData): string {
  const {
    dateRange,
    postCount,
    totalEngagement,
    avgER,
    topPlatform,
    top3Posts,
    top3Insights,
    appUrl,
  } = data;

  const postsHtml = top3Posts
    .map(
      (p, i) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
          <div style="font-size: 13px; color: #71717a; margin-bottom: 4px;">#${i + 1} &middot; ${p.platform.toUpperCase()}</div>
          <div style="font-size: 14px; color: #18181b; line-height: 1.5;">${p.caption.length > 120 ? p.caption.slice(0, 120) + "..." : p.caption}</div>
          <div style="margin-top: 6px; font-size: 12px; color: #a1a1aa;">
            ER: ${(p.engagementRate * 100).toFixed(2)}% &middot; Views: ${p.views.toLocaleString()}
          </div>
        </td>
      </tr>`
    )
    .join("");

  const insightsHtml = top3Insights
    .map(
      (ins) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-bottom: 2px;">${ins.category}</div>
          <div style="font-size: 14px; font-weight: 600; color: #18181b;">${ins.title}</div>
          <div style="font-size: 13px; color: #52525b; margin-top: 2px; line-height: 1.4;">${ins.description}</div>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color: #18181b; padding: 24px 32px;">
            <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">TIC Social Insights</div>
            <div style="font-size: 13px; color: #a1a1aa; margin-top: 4px;">Weekly Digest &middot; ${dateRange}</div>
          </td>
        </tr>

        <!-- Performance Summary -->
        <tr>
          <td style="padding: 28px 32px 0;">
            <div style="font-size: 16px; font-weight: 700; color: #18181b; margin-bottom: 16px;">Performance Summary</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" style="text-align: center; padding: 12px 8px; background-color: #f4f4f5; border-radius: 8px;">
                  <div style="font-size: 22px; font-weight: 700; color: #18181b;">${postCount}</div>
                  <div style="font-size: 11px; color: #71717a; margin-top: 2px;">Total Posts</div>
                </td>
                <td width="4"></td>
                <td width="25%" style="text-align: center; padding: 12px 8px; background-color: #f4f4f5; border-radius: 8px;">
                  <div style="font-size: 22px; font-weight: 700; color: #18181b;">${totalEngagement.toLocaleString()}</div>
                  <div style="font-size: 11px; color: #71717a; margin-top: 2px;">Engagement</div>
                </td>
                <td width="4"></td>
                <td width="25%" style="text-align: center; padding: 12px 8px; background-color: #f4f4f5; border-radius: 8px;">
                  <div style="font-size: 22px; font-weight: 700; color: #18181b;">${(avgER * 100).toFixed(2)}%</div>
                  <div style="font-size: 11px; color: #71717a; margin-top: 2px;">Avg ER</div>
                </td>
                <td width="4"></td>
                <td width="25%" style="text-align: center; padding: 12px 8px; background-color: #f4f4f5; border-radius: 8px;">
                  <div style="font-size: 22px; font-weight: 700; color: #18181b;">${topPlatform}</div>
                  <div style="font-size: 11px; color: #71717a; margin-top: 2px;">Top Platform</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Top Posts -->
        ${
          top3Posts.length > 0
            ? `<tr>
          <td style="padding: 28px 32px 0;">
            <div style="font-size: 16px; font-weight: 700; color: #18181b; margin-bottom: 8px;">Top Performing Posts</div>
            <table width="100%" cellpadding="0" cellspacing="0">${postsHtml}</table>
          </td>
        </tr>`
            : ""
        }

        <!-- Insights -->
        ${
          top3Insights.length > 0
            ? `<tr>
          <td style="padding: 28px 32px 0;">
            <div style="font-size: 16px; font-weight: 700; color: #18181b; margin-bottom: 8px;">Key Insights</div>
            <table width="100%" cellpadding="0" cellspacing="0">${insightsHtml}</table>
          </td>
        </tr>`
            : ""
        }

        <!-- CTA Button -->
        <tr>
          <td style="padding: 32px; text-align: center;">
            <a href="${appUrl}" style="display: inline-block; padding: 12px 28px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View Full Dashboard</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center;">
            <div style="font-size: 12px; color: #a1a1aa; line-height: 1.5;">
              You're receiving this because you're subscribed to TIC Social Insights digests.<br/>
              <a href="${appUrl}/settings" style="color: #71717a; text-decoration: underline;">Unsubscribe</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
