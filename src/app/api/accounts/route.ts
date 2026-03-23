import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("Failed to fetch accounts:", err);
    return NextResponse.json({ accounts: [], error: "Database not connected" });
  }
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (err) {
    console.error("Failed to create account:", err);
    return NextResponse.json(
      { error: "Database not connected. Please set up Vercel Postgres first." },
      { status: 500 }
    );
  }
}
