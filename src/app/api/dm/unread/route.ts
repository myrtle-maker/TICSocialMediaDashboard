import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/dm/unread — total unread message count for the current user
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ count: 0 });

  const count = await prisma.directMessage.count({
    where: { recipientId: me.id, readAt: null },
  });

  return NextResponse.json({ count });
}
