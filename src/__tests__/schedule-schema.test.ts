import { describe, it, expect } from "vitest";
import { createScheduledPostSchema, patchScheduledPostSchema } from "@/lib/schedule-schema";

// ---- createScheduledPostSchema ----

describe("createScheduledPostSchema", () => {
  const validBase = {
    platform: "tiktok",
    contentType: "video",
    scheduledAt: "2026-06-01T10:00:00.000Z",
  };

  it("accepts a valid minimal payload", () => {
    const result = createScheduledPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = createScheduledPostSchema.safeParse({
      ...validBase,
      hookType: "question",
      caption: "Test caption",
      notes: "Some notes",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid platform", () => {
    const result = createScheduledPostSchema.safeParse({
      ...validBase,
      platform: "myspace",
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.platform).toBeDefined();
  });

  it("rejects an invalid contentType", () => {
    const result = createScheduledPostSchema.safeParse({
      ...validBase,
      contentType: "vibes",
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.contentType).toBeDefined();
  });

  it("rejects an invalid hookType", () => {
    const result = createScheduledPostSchema.safeParse({
      ...validBase,
      hookType: "unknown-hook",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date string", () => {
    const result = createScheduledPostSchema.safeParse({
      ...validBase,
      scheduledAt: "not-a-date",
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.scheduledAt).toBeDefined();
  });

  it("rejects a caption over 2200 chars", () => {
    const result = createScheduledPostSchema.safeParse({
      ...validBase,
      caption: "x".repeat(2201),
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.caption).toBeDefined();
  });

  it("rejects missing required fields", () => {
    const result = createScheduledPostSchema.safeParse({
      caption: "A caption",
    });
    expect(result.success).toBe(false);
    const errors = result.error?.flatten().fieldErrors;
    expect(errors?.platform).toBeDefined();
    expect(errors?.contentType).toBeDefined();
    expect(errors?.scheduledAt).toBeDefined();
  });

  it("accepts all valid platforms", () => {
    const platforms = ["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin"];
    for (const platform of platforms) {
      const result = createScheduledPostSchema.safeParse({ ...validBase, platform });
      expect(result.success, `Expected ${platform} to be valid`).toBe(true);
    }
  });

  it("accepts all valid content types", () => {
    const types = ["video", "image", "carousel", "text", "reel", "short", "story", "live"];
    for (const contentType of types) {
      const result = createScheduledPostSchema.safeParse({ ...validBase, contentType });
      expect(result.success, `Expected ${contentType} to be valid`).toBe(true);
    }
  });
});

// ---- patchScheduledPostSchema ----

describe("patchScheduledPostSchema", () => {
  it("accepts an empty patch (all fields optional)", () => {
    const result = patchScheduledPostSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid status update", () => {
    const result = patchScheduledPostSchema.safeParse({ status: "published" });
    expect(result.success).toBe(true);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["planned", "published", "skipped"]) {
      const result = patchScheduledPostSchema.safeParse({ status });
      expect(result.success, `Expected status '${status}' to be valid`).toBe(true);
    }
  });

  it("rejects an invalid status", () => {
    const result = patchScheduledPostSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.status).toBeDefined();
  });

  it("rejects an invalid platform in patch", () => {
    const result = patchScheduledPostSchema.safeParse({ platform: "bebo" });
    expect(result.success).toBe(false);
  });

  it("accepts hookType: null (clearing the hook)", () => {
    const result = patchScheduledPostSchema.safeParse({ hookType: null });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date string in patch", () => {
    const result = patchScheduledPostSchema.safeParse({ scheduledAt: "banana" });
    expect(result.success).toBe(false);
  });
});
