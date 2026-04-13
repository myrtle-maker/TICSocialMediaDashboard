import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_METRICS = ["engagementRate", "views", "likes", "comments", "shares", "saves", "posts"] as const;
const VALID_PERIODS = ["monthly", "weekly", "quarterly"] as const;

const upsertSchema = z.object({
  metric: z.enum(VALID_METRICS),
  period: z.enum(VALID_PERIODS),
  platform: z.string().nullable().optional(),
  target: z.number().positive(),
});

// GET /api/kpi-targets — list all targets
export async function GET() {
  try {
    const targets = await prisma.kpiTarget.findMany({
      orderBy: [{ period: "asc" }, { metric: "asc" }],
    });
    return NextResponse.json({ targets });
  } catch (err) {
    console.error("[kpi-targets] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

// POST /api/kpi-targets — create or update a target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const { metric, period, platform, target } = parsed.data;

    const existing = await prisma.kpiTarget.findFirst({
      where: { metric, period, platform: platform ?? null },
    });

    const kpiTarget = existing
      ? await prisma.kpiTarget.update({ where: { id: existing.id }, data: { target } })
      : await prisma.kpiTarget.create({ data: { metric, period, platform: platform ?? null, target } });

    return NextResponse.json({ target: kpiTarget });
  } catch (err) {
    console.error("[kpi-targets] POST error:", err);
    return NextResponse.json({ error: "Failed to save target" }, { status: 500 });
  }
}

// DELETE /api/kpi-targets?id=xxx — remove a target
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.kpiTarget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[kpi-targets] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete target" }, { status: 500 });
  }
}
