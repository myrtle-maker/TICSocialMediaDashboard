import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type SlackEvent =
  | "guideCreated"
  | "fileUploaded"
  | "cardMoved"
  | "ideaPromoted"
  | "postScheduled"
  | "scrapeComplete"
  | "performanceAlert";

export const DEFAULT_SLACK_EVENTS: Record<SlackEvent, boolean> = {
  guideCreated: true,
  fileUploaded: true,
  cardMoved: true,
  ideaPromoted: true,
  postScheduled: true,
  scrapeComplete: true,
  performanceAlert: true,
};

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

interface SlackConfig {
  webhookUrl: string;
  events: Record<SlackEvent, boolean>;
}

async function getSlackConfig(): Promise<SlackConfig | null> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ["slackWebhookUrl", "slackEvents"] } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    if (!map.slackWebhookUrl) return null;

    const events: Record<SlackEvent, boolean> = { ...DEFAULT_SLACK_EVENTS };
    if (map.slackEvents) {
      try {
        Object.assign(events, JSON.parse(map.slackEvents));
      } catch {}
    }

    return { webhookUrl: map.slackWebhookUrl, events };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Low-level POST
// ---------------------------------------------------------------------------

async function postToSlack(webhookUrl: string, blocks: object[]): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) {
    throw new Error(`Slack responded ${res.status}: ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// notify() — fire-and-forget; never throws
// ---------------------------------------------------------------------------

export function notify(event: SlackEvent, blocks: object[]): void {
  void (async () => {
    try {
      const config = await getSlackConfig();
      if (!config) return;
      // Treat undefined/missing as enabled; only skip when explicitly false
      if (config.events[event] === false) return;
      await postToSlack(config.webhookUrl, blocks);
    } catch {
      // Silent — Slack failures must never surface to the API caller
    }
  })();
}

// ---------------------------------------------------------------------------
// sendToWebhook() — direct send, used by the test endpoint
// ---------------------------------------------------------------------------

export async function sendToWebhook(webhookUrl: string, blocks: object[]): Promise<void> {
  await postToSlack(webhookUrl, blocks);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function ts(): string {
  const d = new Date();
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
}

function footer() {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text: `TIC Social Insights  •  ${ts()}` }],
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Block builders — one per event
// ---------------------------------------------------------------------------

export function guideCreatedBlocks(title: string, category: string): object[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:memo: *Guide created*\n*${title}* — _${category}_`,
      },
    },
    footer(),
  ];
}

export function fileUploadedBlocks(fileName: string, guideTitle: string): object[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:paperclip: *File uploaded*\n\`${fileName}\` added to *${guideTitle}*`,
      },
    },
    footer(),
  ];
}

export function cardMovedBlocks(cardTitle: string, fromList: string, toList: string): object[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:card_index: *Card moved*\n*${cardTitle}*\n_${fromList}_ → _${toList}_`,
      },
    },
    footer(),
  ];
}

export function ideaPromotedBlocks(
  ideaTitle: string,
  platform: string,
  scheduledAt: string
): object[] {
  const date = new Date(scheduledAt).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:rocket: *Idea promoted to schedule*\n*${ideaTitle}*\n${cap(platform)} on ${date}`,
      },
    },
    footer(),
  ];
}

export function postScheduledBlocks(
  platform: string,
  contentType: string,
  scheduledAt: string
): object[] {
  const date = new Date(scheduledAt).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:calendar: *Post scheduled*\n${cap(platform)} ${contentType} on ${date}`,
      },
    },
    footer(),
  ];
}

export function scrapeCompleteBlocks(totalPosts: number, jobCount: number): object[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: *Data collection complete*\n${totalPosts.toLocaleString()} post${totalPosts !== 1 ? "s" : ""} scraped across ${jobCount} account${jobCount !== 1 ? "s" : ""}`,
      },
    },
    footer(),
  ];
}

export function performanceAlertBlocks(
  total: number,
  overperforming: number,
  underperforming: number
): object[] {
  const parts = [
    overperforming > 0 ? `${overperforming} overperforming :chart_with_upwards_trend:` : null,
    underperforming > 0 ? `${underperforming} underperforming :chart_with_downwards_trend:` : null,
  ].filter(Boolean);

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:rotating_light: *Performance alert*\n${total} post${total !== 1 ? "s" : ""} flagged in the last 48 hours\n${parts.join("  •  ")}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "View Dashboard", emoji: true },
        url: appUrl(),
      },
    },
    footer(),
  ];
}

export function testBlocks(): object[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: *TIC Social Insights — Slack connected!*\nThis is a test notification. Everything is working correctly.`,
      },
    },
    footer(),
  ];
}
