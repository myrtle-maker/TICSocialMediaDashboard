import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";

const AUTH_SALT = "tic-social-insights-2024";

function generateToken(password: string): string {
  return createHash("sha256")
    .update(password + AUTH_SALT)
    .digest("hex");
}

export function proxy(request: NextRequest) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;

  // If no password is configured, skip auth entirely
  if (!dashboardPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow login page and auth API routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("tic-auth");
  const expectedToken = generateToken(dashboardPassword);

  if (!authCookie || authCookie.value !== expectedToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
