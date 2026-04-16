import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;

  try {
    const guide = await prisma.strategyGuide.findUnique({ where: { id } });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    const files = (guide.files as Array<{ id: string; url: string }>) ?? [];
    const target = files.find((f) => f.id === fileId);

    if (!target) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from Vercel Blob
    await del(target.url);

    const updated = await prisma.strategyGuide.update({
      where: { id },
      data: { files: files.filter((f) => f.id !== fileId) },
    });

    return NextResponse.json({ guide: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
