import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  template: z.enum(["blank", "video-production", "content-calendar", "campaign-planning"]).optional(),
});

const TEMPLATES: Record<string, string[]> = {
  "video-production": ["Ideas", "Scripting", "Filming", "Editing", "Review", "Published"],
  "content-calendar": ["Planned", "In Progress", "Scheduled", "Live"],
  "campaign-planning": ["Brief", "Research", "Creative", "Approval", "Live"],
};

export async function GET() {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { lists: true } },
        lists: {
          include: { _count: { select: { cards: true } } },
        },
      },
    });
    return NextResponse.json({ boards });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const { name, description, color, template = "blank" } = parsed.data;

    const board = await prisma.board.create({
      data: { name, description, color: color ?? "#6366f1" },
    });

    const columnNames = TEMPLATES[template] ?? [];
    if (columnNames.length > 0) {
      await prisma.boardList.createMany({
        data: columnNames.map((col, i) => ({
          boardId: board.id,
          name: col,
          sortOrder: i,
        })),
      });
    }

    const full = await prisma.board.findUnique({
      where: { id: board.id },
      include: { lists: { orderBy: { sortOrder: "asc" }, include: { cards: { orderBy: { sortOrder: "asc" } } } } },
    });
    return NextResponse.json({ board: full }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
