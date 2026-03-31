import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      where.scheduledAt = dateFilter;
    }

    const posts = await prisma.scheduledPost.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Failed to fetch scheduled posts:", err);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, contentType, hookType, caption, notes, scheduledAt } = body;

    if (!platform || !contentType || !scheduledAt) {
      return NextResponse.json(
        { error: "platform, contentType, and scheduledAt are required" },
        { status: 400 }
      );
    }

    const post = await prisma.scheduledPost.create({
      data: {
        platform,
        contentType,
        hookType: hookType || null,
        caption: caption || "",
        notes: notes || "",
        scheduledAt: new Date(scheduledAt),
        status: "planned",
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("Failed to create scheduled post:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
