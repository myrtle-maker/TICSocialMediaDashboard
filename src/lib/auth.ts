import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarColor: string;
}

// ---------------------------------------------------------------------------
// Secret
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const raw =
    process.env.AUTH_JWT_SECRET ??
    process.env.DASHBOARD_PASSWORD ??
    "tic-social-insights-change-me";
  return new TextEncoder().encode(raw);
}

export const COOKIE_NAME = "tic-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarColor: user.avatarColor,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(getSecret());
}

// ---------------------------------------------------------------------------
// Verify (edge-safe — used in middleware)
// ---------------------------------------------------------------------------

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: payload.email as string,
      name: payload.name as string,
      role: (payload.role as string) ?? "member",
      avatarColor: (payload.avatarColor as string) ?? "#6366f1",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Server-side helper: get current user from the request cookie jar
// ---------------------------------------------------------------------------

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie options
// ---------------------------------------------------------------------------

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  };
}
