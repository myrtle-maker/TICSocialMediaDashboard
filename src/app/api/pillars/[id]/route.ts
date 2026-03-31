import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patchPillarSchema } from "@/lib/mindmap-schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchPillarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const pillar = await prisma.contentPillar.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ pillar });
  } catch (err) {
    console.error("[pillars/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update pillar" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.contentPillar.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[pillars/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete pillar" }, { status: 500 });
  }
}
