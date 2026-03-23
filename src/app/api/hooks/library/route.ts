import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const platform = searchParams.get("platform");
    const hookType = searchParams.get("hookType");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "engagementRate";
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);

    // Build where clause
    const where: Prisma.PostWhereInput = {
      hookText: { not: "" },
    };

    if (platform) {
      where.platform = platform;
    }

    if (hookType) {
      where.hookType = hookType;
    }

    if (search) {
      where.hookText = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Determine sort field
    const validSortFields = [
      "engagementRate",
      "views",
      "likes",
      "shares",
      "hookScore",
    ];
    const orderField = validSortFields.includes(sortBy)
      ? sortBy
      : "engagementRate";

    // Fetch posts with hooks, ordered by chosen metric
    const posts = await prisma.post.findMany({
      where,
      orderBy: { [orderField]: "desc" },
      take: limit * 2, // Fetch extra for deduplication
      select: {
        id: true,
        hookText: true,
        hookType: true,
        hookScore: true,
        platform: true,
        contentType: true,
        caption: true,
        engagementRate: true,
        views: true,
        likes: true,
        shares: true,
        saves: true,
        publishedAt: true,
        permalink: true,
      },
    });

    // Deduplicate by hookText (keep the best-performing version)
    const seen = new Map<
      string,
      (typeof posts)[number]
    >();
    for (const post of posts) {
      const key = post.hookText.toLowerCase().trim();
      const existing = seen.get(key);
      if (
        !existing ||
        post.engagementRate > existing.engagementRate
      ) {
        seen.set(key, post);
      }
    }

    const deduplicated = Array.from(seen.values())
      .sort((a, b) => {
        const aVal = a[orderField as keyof typeof a] as number;
        const bVal = b[orderField as keyof typeof b] as number;
        return bVal - aVal;
      })
      .slice(0, limit);

    return Response.json({
      hooks: deduplicated,
      total: deduplicated.length,
    });
  } catch (err) {
    console.error("Failed to fetch hook library:", err);
    return Response.json({ hooks: [], total: 0 }, { status: 500 });
  }
}
