import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ account });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;

  try {
    await prisma.account.delete({ where: { id: accountId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
}
