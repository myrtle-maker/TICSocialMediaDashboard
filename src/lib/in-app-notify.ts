import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Event types (mirrors Slack events)
// ---------------------------------------------------------------------------

export type NotificationEvent =
  | "guideCreated"
  | "fileUploaded"
  | "cardMoved"
  | "ideaPromoted"
  | "postScheduled"
  | "scrapeComplete"
  | "performanceAlert";

// ---------------------------------------------------------------------------
// inAppNotify — fire-and-forget; never throws
// ---------------------------------------------------------------------------

export function inAppNotify(
  event: NotificationEvent,
  title: string,
  body: string,
  href?: string
): void {
  void (async () => {
    try {
      await prisma.notification.create({
        data: { event, title, body, href: href ?? null },
      });
    } catch {
      // Silent — notification failures must never surface to callers
    }
  })();
}
