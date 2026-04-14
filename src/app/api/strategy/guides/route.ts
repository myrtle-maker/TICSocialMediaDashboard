import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(["brand-voice", "audience", "visual-style", "content-rules", "workflow", "general"]),
  content: z.string().default(""),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    const guides = await prisma.strategyGuide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ guides });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });

    const maxOrder = await prisma.strategyGuide.aggregate({ _max: { sortOrder: true } });
    const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

    const guide = await prisma.strategyGuide.create({
      data: { ...parsed.data, sortOrder },
    });
    return NextResponse.json({ guide }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
