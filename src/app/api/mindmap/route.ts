import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_RELATED_PER_IDEA = 5;
const MAX_RELATED_PER_PILLAR = 3;

export async function GET() {
  try {
    // Fetch all pillars with their ideas
    const pillars = await prisma.contentPillar.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { ideas: { orderBy: { createdAt: "asc" } } },
    });

    if (pillars.length === 0) {
      return NextResponse.json({ pillars: [] });
    }

    // Enrich each idea with related posts
    const enrichedPillars = await Promise.all(
      pillars.map(async (pillar) => {
        // Pillar-level related posts (keyword match on pillar name)
        const pillarPosts = await prisma.post.findMany({
          where: {
            caption: { contains: pillar.name, mode: "insensitive" },
          },
          orderBy: { engagementRate: "desc" },
          take: MAX_RELATED_PER_PILLAR,
        });

        const enrichedIdeas = await Promise.all(
          pillar.ideas.map(async (idea) => {
            // Build a composite OR query for maximum matching
            const orConditions = [];

            if (idea.targetHashtags.length > 0) {
              orConditions.push({ hashtags: { hasSome: idea.targetHashtags } });
            }
            if (idea.hookType) {
              orConditions.push({ hookType: idea.hookType });
            }
            if (idea.contentType) {
              orConditions.push({ contentType: idea.contentType });
            }
            if (idea.keywords.length > 0) {
              orConditions.push(
                ...idea.keywords.map((kw) => ({
                  caption: { contains: kw, mode: "insensitive" as const },
                }))
              );
            }
            // Fallback: match by pillar name
            orConditions.push({
              caption: { contains: pillar.name, mode: "insensitive" as const },
            });

            const relatedPosts = await prisma.post.findMany({
              where: orConditions.length > 0 ? { OR: orConditions } : {},
              orderBy: { engagementRate: "desc" },
              take: MAX_RELATED_PER_IDEA,
            });

            return { ...idea, relatedPosts };
          })
        );

        return { ...pillar, ideas: enrichedIdeas, relatedPosts: pillarPosts };
      })
    );

    return NextResponse.json({ pillars: enrichedPillars });
  } catch (err) {
    console.error("[mindmap] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch mindmap data" }, { status: 500 });
  }
}
