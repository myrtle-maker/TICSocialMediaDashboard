import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public — no auth required. Tells the login page whether first-run setup is needed.
export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    // DB not reachable — allow login page to render normally
    return NextResponse.json({ needsSetup: false });
  }
}
