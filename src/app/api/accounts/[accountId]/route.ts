import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (err) {
    console.error("Failed to fetch account:", err);
    return NextResponse.json({ error: "Database not connected" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    await prisma.account.delete({ where: { id: accountId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete account:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
