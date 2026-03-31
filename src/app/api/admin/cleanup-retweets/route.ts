import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time cleanup: delete Twitter posts that are retweets (caption starts with "RT @").
// These pollute analytics with the original tweet's engagement numbers.
// Safe to call multiple times — idempotent.
export async function POST() {
  try {
    const result = await prisma.post.deleteMany({
      where: {
        platform: "twitter",
        caption: { startsWith: "RT @" },
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Removed ${result.count} retweet${result.count === 1 ? "" : "s"} from the database.`,
    });
  } catch (err) {
    console.error("Retweet cleanup error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cleanup failed" },
      { status: 500 }
    );
  }
}
