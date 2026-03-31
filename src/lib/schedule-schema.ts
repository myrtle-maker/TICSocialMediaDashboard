import { z } from "zod";

export const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin"] as const;
export const CONTENT_TYPES = ["video", "image", "carousel", "text", "reel", "short", "story", "live"] as const;
export const HOOK_TYPES = ["question", "statistic", "controversy", "story", "cta", "trend", "educational", "emotional", "other"] as const;
export const STATUSES = ["planned", "published", "skipped"] as const;

const dateString = z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date");

export const createScheduledPostSchema = z.object({
  platform: z.enum(PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  hookType: z.enum(HOOK_TYPES).optional(),
  caption: z.string().max(2200).optional(),
  notes: z.string().max(1000).optional(),
  scheduledAt: dateString,
});

export const patchScheduledPostSchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  hookType: z.enum(HOOK_TYPES).nullable().optional(),
  caption: z.string().max(2200).optional(),
  notes: z.string().max(1000).optional(),
  scheduledAt: dateString.optional(),
  status: z.enum(STATUSES).optional(),
});
