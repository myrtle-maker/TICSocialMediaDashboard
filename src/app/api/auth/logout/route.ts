import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Clear new session cookie
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  // Also clear the old cookie in case user had it
  response.cookies.set("tic-auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
