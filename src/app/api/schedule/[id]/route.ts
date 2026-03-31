import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { platform, contentType, hookType, caption, notes, scheduledAt, status } = body;

    const post = await prisma.scheduledPost.update({
      where: { id: params.id },
      data: {
        ...(platform !== undefined && { platform }),
        ...(contentType !== undefined && { contentType }),
        ...(hookType !== undefined && { hookType: hookType || null }),
        ...(caption !== undefined && { caption }),
        ...(notes !== undefined && { notes }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ post });
  } catch (err) {
    console.error("Failed to update scheduled post:", err);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.scheduledPost.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete scheduled post:", err);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
