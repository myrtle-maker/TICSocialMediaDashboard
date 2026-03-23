import { NextRequest, NextResponse } from "next/server";
import { getKpis } from "@/lib/db";
import type { Platform } from "@/types/social";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const platforms = searchParams.get("platforms");
  const filters = platforms
    ? { platforms: platforms.split(",") as Platform[] }
    : undefined;

  const kpis = getKpis(filters);
  return NextResponse.json(kpis);
}
