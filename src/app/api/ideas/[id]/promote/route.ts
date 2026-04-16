import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promoteIdeaSchema } from "@/lib/mindmap-schema";
import { notify, ideaPromotedBlocks } from "@/lib/slack";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = promoteIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    // Create the ScheduledPost
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        platform: parsed.data.platform,
        contentType: parsed.data.contentType,
        hookType: parsed.data.hookType ?? null,
        caption: parsed.data.caption ?? "",
        notes: parsed.data.notes ?? "",
        scheduledAt: new Date(parsed.data.scheduledAt),
        status: "planned",
      },
    });

    // Mark the idea as promoted
    const idea = await prisma.postIdea.update({
      where: { id },
      data: { status: "promoted", scheduledPostId: scheduledPost.id },
    });

    notify(
      "ideaPromoted",
      ideaPromotedBlocks(idea.title, scheduledPost.platform, scheduledPost.scheduledAt.toISOString())
    );
    return NextResponse.json({ scheduledPost, idea });
  } catch (err) {
    console.error("[ideas/[id]/promote] POST error:", err);
    return NextResponse.json({ error: "Failed to promote idea" }, { status: 500 });
  }
}
