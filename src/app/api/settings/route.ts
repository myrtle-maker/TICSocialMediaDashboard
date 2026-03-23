import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return NextResponse.json({ settings: map });
}

export async function PUT(request: NextRequest) {
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
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    await prisma.setting.delete({ where: { key } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Setting not found" }, { status: 404 });
  }
}
