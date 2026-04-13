import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        handle: true,
        displayName: true,
        platform: true,
        followers: true,
        snapshots: {
          select: { followers: true, snapshotAt: true },
          orderBy: { snapshotAt: "asc" },
        },
      },
    });

    // Build per-account series. If no snapshots yet, synthesise a single
    // data point from the current followers value so the chart isn't empty.
    const series = accounts.map((acc) => {
      const points =
        acc.snapshots.length > 0
          ? acc.snapshots.map((s) => ({
              date: s.snapshotAt.toISOString().slice(0, 10),
              followers: s.followers,
            }))
          : [
              {
                date: new Date().toISOString().slice(0, 10),
                followers: acc.followers,
              },
            ];

      return {
        accountId: acc.id,
        handle: acc.handle,
        displayName: acc.displayName,
        platform: acc.platform,
        currentFollowers: acc.followers,
        points,
      };
    });

    return NextResponse.json({ series });
  } catch (err) {
    console.error("[follower-growth] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
