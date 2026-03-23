import { NextResponse } from "next/server";
import { getContentAnalysis } from "@/lib/db";

export async function GET() {
  const analysis = getContentAnalysis();
  return NextResponse.json({ analysis });
}
