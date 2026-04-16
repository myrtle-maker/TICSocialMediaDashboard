import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;

  try {
    const guide = await prisma.strategyGuide.findUnique({ where: { id } });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    const files = (guide.files as Array<{ id: string; url: string; name: string; contentType: string }>) ?? [];
    const target = files.find((f) => f.id === fileId);

    if (!target) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Fetch the private blob server-side using the read/write token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const blobRes = await fetch(target.url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!blobRes.ok) {
      return NextResponse.json(
        { error: `Blob fetch failed: ${blobRes.status}` },
        { status: 502 }
      );
    }

    const contentType = target.contentType || "application/octet-stream";
    const disposition = `attachment; filename="${encodeURIComponent(target.name)}"`;

    return new NextResponse(blobRes.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
