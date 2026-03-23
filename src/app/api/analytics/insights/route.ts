import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInsights } from "@/lib/analytics/insights";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const where: Record<string, unknown> = {};

    const platforms = searchParams.get("platforms");
    if (platforms) where.platform = { in: platforms.split(",") };

    const contentTypes = searchParams.get("contentTypes");
    if (contentTypes) where.contentType = { in: contentTypes.split(",") };

    const hookTypes = searchParams.get("hookTypes");
    if (hookTypes) where.hookType = { in: hookTypes.split(",") };

    const accounts = searchParams.get("accounts");
    if (accounts) where.accountId = { in: accounts.split(",") };

    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.publishedAt = dateFilter;
    }

    const posts = await prisma.post.findMany({ where });
    const result = generateInsights(posts);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to generate insights:", err);
    return NextResponse.json(
      { insights: [], generatedAt: new Date().toISOString(), postCount: 0, dateRange: null },
      { status: 500 }
    );
  }
}
