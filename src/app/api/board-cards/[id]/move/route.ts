import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notify, cardMovedBlocks } from "@/lib/slack";
import { inAppNotify } from "@/lib/in-app-notify";

const moveSchema = z.object({
  toListId: z.string(),
  newIndex: z.number().int().min(0),
});

// POST /api/board-cards/[id]/move — move a card to a new list at a given index,
// reindexing both the source and destination lists so sortOrder stays tidy.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });

    const { toListId, newIndex } = parsed.data;

    const card = await prisma.boardCard.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const fromListId = card.listId;

    if (fromListId === toListId) {
      // Same list — reindex
      const cards = await prisma.boardCard.findMany({
        where: { listId: toListId },
        orderBy: { sortOrder: "asc" },
      });
      const filtered = cards.filter((c) => c.id !== id);
      filtered.splice(newIndex, 0, card);
      await Promise.all(
        filtered.map((c, i) =>
          prisma.boardCard.update({ where: { id: c.id }, data: { sortOrder: i } })
        )
      );
    } else {
      // Cross-list move
      const [srcCards, dstCards] = await Promise.all([
        prisma.boardCard.findMany({ where: { listId: fromListId }, orderBy: { sortOrder: "asc" } }),
        prisma.boardCard.findMany({ where: { listId: toListId }, orderBy: { sortOrder: "asc" } }),
      ]);

      const newSrc = srcCards.filter((c) => c.id !== id);
      const newDst = [...dstCards];
      newDst.splice(newIndex, 0, card);

      await Promise.all([
        // Update the moved card's list and sortOrder
        prisma.boardCard.update({ where: { id }, data: { listId: toListId, sortOrder: newIndex } }),
        // Reindex source
        ...newSrc.map((c, i) => prisma.boardCard.update({ where: { id: c.id }, data: { sortOrder: i } })),
        // Reindex destination (skip the moved card itself — handled above)
        ...newDst
          .filter((c) => c.id !== id)
          .map((c, i) =>
            prisma.boardCard.update({ where: { id: c.id }, data: { sortOrder: i >= newIndex ? i + 1 : i } })
          ),
      ]);
    }

    // Notify Slack on cross-list moves (progress in the workflow)
    if (fromListId !== toListId) {
      const lists = await prisma.boardList
        .findMany({ where: { id: { in: [fromListId, toListId] } }, select: { id: true, name: true } })
        .catch(() => [] as { id: string; name: string }[]);
      const fromName = lists.find((l) => l.id === fromListId)?.name ?? "Unknown";
      const toName = lists.find((l) => l.id === toListId)?.name ?? "Unknown";
      notify("cardMoved", cardMovedBlocks(card.title, fromName, toName));
      inAppNotify("cardMoved", "Card moved", `"${card.title}" moved from ${fromName} → ${toName}`, "/workflow");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
