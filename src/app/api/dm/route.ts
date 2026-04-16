import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/dm?with=<userId>  → conversation thread (50 most recent messages)
// GET /api/dm                → inbox summary (latest message per conversation)
export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const withUserId = searchParams.get("with");

  if (withUserId) {
    // Full thread with one user
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: withUserId },
          { senderId: withUserId, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        sender: { select: { id: true, name: true, avatarColor: true } },
      },
    });

    // Mark unread messages from the other user as read
    await prisma.directMessage.updateMany({
      where: { senderId: withUserId, recipientId: me.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ messages });
  }

  // Inbox: find all users I've exchanged messages with + latest message + unread count
  const [sent, received] = await Promise.all([
    prisma.directMessage.findMany({
      where: { senderId: me.id },
      distinct: ["recipientId"],
      orderBy: { createdAt: "desc" },
      select: { recipientId: true },
    }),
    prisma.directMessage.findMany({
      where: { recipientId: me.id },
      distinct: ["senderId"],
      orderBy: { createdAt: "desc" },
      select: { senderId: true },
    }),
  ]);

  const peerIds = [
    ...new Set([
      ...sent.map((m) => m.recipientId),
      ...received.map((m) => m.senderId),
    ]),
  ];

  const conversations = await Promise.all(
    peerIds.map(async (peerId) => {
      const [latest, unread, peer] = await Promise.all([
        prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: me.id, recipientId: peerId },
              { senderId: peerId, recipientId: me.id },
            ],
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.directMessage.count({
          where: { senderId: peerId, recipientId: me.id, readAt: null },
        }),
        prisma.user.findUnique({
          where: { id: peerId },
          select: { id: true, name: true, avatarColor: true },
        }),
      ]);
      return { peer, latest, unread };
    })
  );

  conversations.sort((a, b) =>
    (b.latest?.createdAt?.getTime() ?? 0) - (a.latest?.createdAt?.getTime() ?? 0)
  );

  return NextResponse.json({ conversations });
}

// POST /api/dm — send a message
export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { recipientId, body: msgBody } = body as { recipientId?: string; body?: string };

  if (!recipientId || !msgBody?.trim()) {
    return NextResponse.json({ error: "recipientId and body are required" }, { status: 400 });
  }
  if (recipientId === me.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  const message = await prisma.directMessage.create({
    data: { senderId: me.id, recipientId, body: msgBody.trim() },
    include: { sender: { select: { id: true, name: true, avatarColor: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
