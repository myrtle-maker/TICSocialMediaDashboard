import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  listId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  platform: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  labels: z.array(z.string()).optional(),
  dueDate: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });

    const { listId, title, description, platform, contentType, priority, labels, dueDate, assignee } = parsed.data;

    const lastCard = await prisma.boardCard.findFirst({
      where: { listId },
      orderBy: { sortOrder: "desc" },
    });

    const card = await prisma.boardCard.create({
      data: {
        listId,
        title,
        description: description ?? "",
        platform: platform ?? null,
        contentType: contentType ?? null,
        priority: priority ?? "medium",
        labels: labels ?? [],
        dueDate: dueDate ? new Date(dueDate) : null,
        assignee: assignee ?? null,
        sortOrder: (lastCard?.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
