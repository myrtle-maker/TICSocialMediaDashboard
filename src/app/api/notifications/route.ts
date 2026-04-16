import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/notifications
// Returns the 50 most recent notifications plus the unread count for the
// current user (anything created after their lastNotificationsSeenAt).
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [notifications, dbUser] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { lastNotificationsSeenAt: true },
      }),
    ]);

    const seenAt = dbUser?.lastNotificationsSeenAt ?? null;
    const unreadCount = seenAt
      ? notifications.filter((n) => n.createdAt > seenAt).length
      : notifications.length;

    return NextResponse.json({ notifications, unreadCount, seenAt });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
