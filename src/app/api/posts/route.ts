import { NextRequest, NextResponse } from "next/server";
import { getPosts } from "@/lib/db";
import type { PostFilters, Platform, ContentType, HookType } from "@/types/social";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: Partial<PostFilters> = {};

  const platforms = searchParams.get("platforms");
  if (platforms) filters.platforms = platforms.split(",") as Platform[];

  const contentTypes = searchParams.get("contentTypes");
  if (contentTypes) filters.contentTypes = contentTypes.split(",") as ContentType[];

  const hookTypes = searchParams.get("hookTypes");
  if (hookTypes) filters.hookTypes = hookTypes.split(",") as HookType[];

  const sortBy = searchParams.get("sortBy");
  if (sortBy) filters.sortBy = sortBy as PostFilters["sortBy"];

  const sortOrder = searchParams.get("sortOrder");
  if (sortOrder) filters.sortOrder = sortOrder as "asc" | "desc";

  const searchQuery = searchParams.get("q");
  if (searchQuery) filters.searchQuery = searchQuery;

  const minEngagementRate = searchParams.get("minEngagementRate");
  if (minEngagementRate) filters.minEngagementRate = parseFloat(minEngagementRate);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from && to) {
    filters.dateRange = { from: new Date(from), to: new Date(to) };
  }

  const posts = getPosts(filters);

  return NextResponse.json({ posts, total: posts.length });
}
