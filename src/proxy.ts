import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// Routes that never require a session
const PUBLIC_PREFIXES = ["/login", "/api/auth/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cron routes: allow if CRON_SECRET header matches (or no secret configured)
  if (pathname.startsWith("/api/cron/")) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.next();
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return NextResponse.next();
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify JWT session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    // API routes → 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Page routes → redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Inject user context as headers for server-side API use
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", user.role);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
