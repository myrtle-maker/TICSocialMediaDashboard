import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return NextResponse.json({ settings: map });
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return NextResponse.json({ settings: {}, error: "Database not connected" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: value ?? "" },
      create: { key, value: value ?? "" },
    });

    return NextResponse.json({ setting });
  } catch (err) {
    console.error("Failed to save setting:", err);
    return NextResponse.json(
      { error: "Database not connected. Please set up Vercel Postgres first." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    await prisma.setting.delete({ where: { key } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete setting:", err);
    return NextResponse.json({ error: "Setting not found" }, { status: 500 });
  }
}
