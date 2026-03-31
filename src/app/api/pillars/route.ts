import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPillarSchema } from "@/lib/mindmap-schema";

export async function GET() {
  try {
    const pillars = await prisma.contentPillar.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { ideas: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ pillars });
  } catch (err) {
    console.error("[pillars] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch pillars" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPillarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const pillar = await prisma.contentPillar.create({ data: parsed.data });
    return NextResponse.json({ pillar }, { status: 201 });
  } catch (err) {
    console.error("[pillars] POST error:", err);
    return NextResponse.json({ error: "Failed to create pillar" }, { status: 500 });
  }
}
