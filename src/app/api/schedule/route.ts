import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createScheduledPostSchema } from "@/lib/schedule-schema";
import { notify, postScheduledBlocks } from "@/lib/slack";
import { inAppNotify } from "@/lib/in-app-notify";

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createScheduledPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { platform, contentType, hookType, caption, notes, scheduledAt } = parsed.data;

    const post = await prisma.scheduledPost.create({
      data: {
        platform,
        contentType,
        hookType: hookType ?? null,
        caption: caption ?? "",
        notes: notes ?? "",
        scheduledAt: new Date(scheduledAt),
        status: "planned",
      },
    });

    notify("postScheduled", postScheduledBlocks(post.platform, post.contentType, post.scheduledAt.toISOString()));
    const postDate = post.scheduledAt.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
    inAppNotify("postScheduled", "Post scheduled", `${post.platform} ${post.contentType} on ${postDate}`, "/schedule");
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("Failed to create scheduled post:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
