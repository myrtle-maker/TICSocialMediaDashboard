import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Extract a clean username from a full URL, @-prefixed string, or plain text.
 */
function cleanHandle(raw: string): string {
  let handle = raw.trim();

  // Strip full URLs down to the path
  try {
    if (handle.startsWith("http")) {
      const url = new URL(handle);
      handle = url.pathname;
    }
  } catch {
    // not a URL
  }

  // Remove leading/trailing slashes
  handle = handle.replace(/^\/+|\/+$/g, "");

  // Remove platform path prefixes
  handle = handle
    .replace(/^company\//i, "")
    .replace(/^channel\//i, "")
    .replace(/^@/, "");

  // Take first path segment only
  if (handle.includes("/")) {
    handle = handle.split("/")[0];
  }

  return handle;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("Failed to fetch accounts:", err);
    return NextResponse.json({ accounts: [], error: "Database not connected" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, handle } = body;

    if (!platform || !handle) {
      return NextResponse.json(
        { error: "platform and handle are required" },
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

    const account = await prisma.account.upsert({
      where: {
        platform_handle: { platform, handle: clean },
      },
      update: {},
      create: {
        platform,
        platformAccountId: clean,
        handle: clean,
        displayName: clean,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    console.error("Failed to create account:", err);
    return NextResponse.json(
      { error: "Database not connected. Please set up Vercel Postgres first." },
      { status: 500 }
    );
  }
}
