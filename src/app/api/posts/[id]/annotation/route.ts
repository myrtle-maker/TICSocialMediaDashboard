import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const annotation = typeof body.annotation === "string" ? body.annotation : "";

    const post = await prisma.post.update({
      where: { id },
      data: { annotation: annotation.trim() },
      select: { id: true, annotation: true },
    });

    return NextResponse.json(post);
  } catch (err) {
    console.error("[annotation] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save annotation" },
      { status: 500 }
    );
  }
}
