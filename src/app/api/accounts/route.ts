import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db";

export async function GET() {
  const accounts = getAccounts();
  return NextResponse.json({ accounts });
}
