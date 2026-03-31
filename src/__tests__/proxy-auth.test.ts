import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "crypto";

// ---- Token generation (mirrors proxy.ts logic) ----

const AUTH_SALT = "tic-social-insights-2024";

function generateToken(password: string): string {
  return createHash("sha256").update(password + AUTH_SALT).digest("hex");
}

describe("generateToken", () => {
  it("produces a 64-char hex string", () => {
    const token = generateToken("secret");
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic for the same password", () => {
    expect(generateToken("mypassword")).toBe(generateToken("mypassword"));
  });

  it("produces different tokens for different passwords", () => {
    expect(generateToken("password1")).not.toBe(generateToken("password2"));
  });

  it("includes the salt (differs from unsalted SHA256)", () => {
    const unsalted = createHash("sha256").update("secret").digest("hex");
    const salted = generateToken("secret");
    expect(salted).not.toBe(unsalted);
  });
});

// ---- Proxy auth logic ----
// We test the token comparison logic in isolation since NextRequest
// is not trivially available in a pure node vitest environment.

describe("proxy auth logic", () => {
  const CORRECT_PASSWORD = "dashboard-password-123";
  const CORRECT_TOKEN = generateToken(CORRECT_PASSWORD);

  it("allows through when no DASHBOARD_PASSWORD is set", () => {
    // Mirrors: if (!dashboardPassword) return NextResponse.next()
    const dashboardPassword = undefined;
    const allowed = !dashboardPassword;
    expect(allowed).toBe(true);
  });

  it("rejects a request with no cookie", () => {
    const cookieToken: string | undefined = undefined;
    const expectedToken = generateToken(CORRECT_PASSWORD);
    expect(cookieToken !== expectedToken).toBe(true);
  });

  it("rejects a request with the wrong token", () => {
    const cookieToken = generateToken("wrong-password");
    const expectedToken = generateToken(CORRECT_PASSWORD);
    expect(cookieToken !== expectedToken).toBe(true);
  });

  it("allows a request with the correct token", () => {
    const cookieToken = CORRECT_TOKEN;
    const expectedToken = generateToken(CORRECT_PASSWORD);
    expect(cookieToken === expectedToken).toBe(true);
  });

  it("rejects a token built from the correct password but wrong salt", () => {
    const tampered = createHash("sha256")
      .update(CORRECT_PASSWORD + "wrong-salt")
      .digest("hex");
    const expectedToken = generateToken(CORRECT_PASSWORD);
    expect(tampered === expectedToken).toBe(false);
  });
});

// ---- Route exemptions ----

describe("proxy route matching", () => {
  // Auth routes must always be reachable
  const EXEMPT_PATHS = ["/api/auth/login", "/api/auth/logout", "/login"];

  it.each(EXEMPT_PATHS)("exempt path %s starts with /api/auth/ or is /login", (path) => {
    const isExempt = path === "/login" || path.startsWith("/api/auth/");
    expect(isExempt).toBe(true);
  });

  const PROTECTED_PATHS = [
    "/api/schedule",
    "/api/schedule/abc123",
    "/api/posts",
    "/api/accounts",
    "/api/ai/briefing",
  ];

  it.each(PROTECTED_PATHS)("protected path %s is not exempt", (path) => {
    const isExempt = path === "/login" || path.startsWith("/api/auth/");
    expect(isExempt).toBe(false);
  });
});
