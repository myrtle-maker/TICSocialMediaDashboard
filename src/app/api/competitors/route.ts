import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanHandle(raw: string): string {
  let handle = raw.trim();
  try {
    if (handle.startsWith("http")) {
      const url = new URL(handle);
      handle = url.pathname;
    }
  } catch {}
  handle = handle.replace(/^\/+|\/+$/g, "");
  handle = handle
    .replace(/^company\//i, "")
    .replace(/^channel\//i, "")
    .replace(/^@/, "");
  if (handle.includes("/")) handle = handle.split("/")[0];
  return handle;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const competitors = await prisma.competitor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({
      competitors: competitors.map((c) => ({
        ...c,
        postCount: c._count.posts,
        _count: undefined,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch competitors:", err);
    return NextResponse.json({ competitors: [], error: "Database not connected" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, handle, displayName } = body;

    if (!platform || !handle || !displayName) {
      return NextResponse.json(
        { error: "platform, handle, and displayName are required" },
        { status: 400 }
      );
    }

    const clean = cleanHandle(handle);
    if (!clean) {
      return NextResponse.json(
        { error: "Could not extract a valid username from the input" },
        { status: 400 }
      );
    }

    // Check if this handle matches one of our own accounts
    const ownAccount = await prisma.account.findUnique({
      where: { platform_handle: { platform, handle: clean } },
    });
    if (ownAccount) {
      return NextResponse.json(
        { error: "This handle belongs to one of your own tracked accounts. You cannot add yourself as a competitor." },
        { status: 400 }
      );
    }

    // Check for duplicate competitor
    const existing = await prisma.competitor.findUnique({
      where: { platform_handle: { platform, handle: clean } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This competitor is already being tracked." },
        { status: 400 }
      );
    }

    const competitor = await prisma.competitor.create({
      data: {
        platform,
        handle: clean,
        displayName,
      },
    });

    return NextResponse.json({ competitor }, { status: 201 });
  } catch (err) {
    console.error("Failed to create competitor:", err);
    return NextResponse.json(
      { error: "Failed to add competitor. Check database connection." },
      { status: 500 }
    );
  }
}
