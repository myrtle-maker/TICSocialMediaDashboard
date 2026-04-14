import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  boardId: z.string(),
  name: z.string().min(1).max(80),
  color: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    const { boardId, name, color } = parsed.data;

    const lastList = await prisma.boardList.findFirst({
      where: { boardId },
      orderBy: { sortOrder: "desc" },
    });

    const list = await prisma.boardList.create({
      data: { boardId, name, color, sortOrder: (lastList?.sortOrder ?? -1) + 1 },
      include: { cards: true },
    });
    return NextResponse.json({ list }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
