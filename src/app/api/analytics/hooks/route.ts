import { NextResponse } from "next/server";
import { getHookAnalysis } from "@/lib/db";

export async function GET() {
  const analysis = getHookAnalysis();
  return NextResponse.json({ analysis });
}
