import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const where: Prisma.PostWhereInput = {};

    const platforms = searchParams.get("platforms");
    if (platforms) where.platform = { in: platforms.split(",") };

    const contentTypes = searchParams.get("contentTypes");
    if (contentTypes) where.contentType = { in: contentTypes.split(",") };

    const hookTypes = searchParams.get("hookTypes");
    if (hookTypes) where.hookType = { in: hookTypes.split(",") };

    const searchQuery = searchParams.get("q");
    if (searchQuery) {
      where.OR = [
        { caption: { contains: searchQuery, mode: "insensitive" } },
        { hookText: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      where.publishedAt = { gte: new Date(from), lte: new Date(to) };
    }

    const minEngagementRate = searchParams.get("minEngagementRate");
    if (minEngagementRate) {
      where.engagementRate = { gte: parseFloat(minEngagementRate) };
    }

    // Sort
    const sortBy = searchParams.get("sortBy") || "publishedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "100");

    const posts = await prisma.post.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
    });

    return NextResponse.json({ posts, total: posts.length });
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    return NextResponse.json({ posts: [], total: 0, error: "Database error" });
  }
}
