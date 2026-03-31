import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patchIdeaSchema } from "@/lib/mindmap-schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const idea = await prisma.postIdea.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ idea });
  } catch (err) {
    console.error("[ideas/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.postIdea.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ideas/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
  }
}
