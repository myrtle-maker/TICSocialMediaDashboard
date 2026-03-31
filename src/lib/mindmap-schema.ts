import { z } from "zod";
import { PLATFORMS, CONTENT_TYPES, HOOK_TYPES } from "@/lib/schedule-schema";

// ---- Pillar schemas ----

export const createPillarSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  sortOrder: z.number().int().optional(),
});

export const patchPillarSchema = createPillarSchema.partial();

// ---- Idea schemas ----

export const createIdeaSchema = z.object({
  pillarId: z.string(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  platform: z.enum(PLATFORMS).nullable().optional(),
  contentType: z.enum(CONTENT_TYPES).nullable().optional(),
  hookType: z.enum(HOOK_TYPES).nullable().optional(),
  targetHashtags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

export const patchIdeaSchema = createIdeaSchema.omit({ pillarId: true }).partial().extend({
  status: z.enum(["idea", "promoted"]).optional(),
  scheduledPostId: z.string().nullable().optional(),
});

// ---- Promote schema (idea → ScheduledPost) ----

export const promoteIdeaSchema = z.object({
  platform: z.enum(PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  hookType: z.enum(HOOK_TYPES).optional(),
  caption: z.string().max(2200).optional(),
  notes: z.string().max(1000).optional(),
  scheduledAt: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date"),
});
