import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const AUTH_SALT = "tic-social-insights-2024";

function generateToken(password: string): string {
  return createHash("sha256")
    .update(password + AUTH_SALT)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;

  // If no password is set, allow access
  if (!dashboardPassword) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== dashboardPassword) {
      return NextResponse.json(
        { error: "Wrong password" },
        { status: 401 }
      );
    }

    const token = generateToken(dashboardPassword);

    const response = NextResponse.json({ success: true });
    response.cookies.set("tic-auth", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
