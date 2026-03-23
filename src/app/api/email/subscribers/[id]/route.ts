import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete by setting active = false
    const subscriber = await prisma.emailSubscriber.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true, subscriber });
  } catch (err) {
    console.error("Failed to remove email subscriber:", err);
    return NextResponse.json(
      { error: "Failed to remove subscriber" },
      { status: 500 }
    );
  }
}
