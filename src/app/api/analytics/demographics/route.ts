import { NextResponse } from "next/server";
import { getPostingHeatmap } from "@/lib/db";

export async function GET() {
  const heatmap = getPostingHeatmap();
  return NextResponse.json({ heatmap });
}
