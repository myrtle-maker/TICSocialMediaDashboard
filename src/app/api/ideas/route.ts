import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createIdeaSchema } from "@/lib/mindmap-schema";

export async function GET(request: NextRequest) {
  try {
    const pillarId = request.nextUrl.searchParams.get("pillarId");
    const ideas = await prisma.postIdea.findMany({
      where: pillarId ? { pillarId } : undefined,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("[ideas] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const idea = await prisma.postIdea.create({
      data: {
        ...parsed.data,
        platform: parsed.data.platform ?? null,
        contentType: parsed.data.contentType ?? null,
        hookType: parsed.data.hookType ?? null,
        targetHashtags: parsed.data.targetHashtags ?? [],
        keywords: parsed.data.keywords ?? [],
      },
    });
    return NextResponse.json({ idea }, { status: 201 });
  } catch (err) {
    console.error("[ideas] POST error:", err);
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
  }
}
