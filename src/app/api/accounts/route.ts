import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { platform, handle } = body;

  if (!platform || !handle) {
    return NextResponse.json(
      { error: "platform and handle are required" },
      { status: 400 }
    );
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  const account = await prisma.account.upsert({
    where: {
      platform_handle: { platform, handle: cleanHandle },
    },
    update: {},
    create: {
      platform,
      platformAccountId: cleanHandle,
      handle: cleanHandle,
      displayName: cleanHandle,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
