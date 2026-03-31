import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Colours aligned with HOOK_TYPE_COLORS in constants.ts
const HOOK_COLORS: Record<string, string> = {
  question:     "#3b82f6",
  statistic:    "#10b981",
  controversy:  "#ef4444",
  story:        "#8b5cf6",
  cta:          "#f59e0b",
  trend:        "#ec4899",
  educational:  "#06b6d4",
  emotional:    "#f97316",
  other:        "#6b7280",
};

const HOOK_LABELS: Record<string, string> = {
  question:     "Questions & Curiosity",
  statistic:    "Data & Statistics",
  controversy:  "Controversy & Challenge",
  story:        "Stories & Narratives",
  cta:          "Calls to Action",
  trend:        "Trends & Moments",
  educational:  "Educational Content",
  emotional:    "Emotional & Relatable",
  other:        "Other Content",
};

const HOOK_DESCRIPTIONS: Record<string, string> = {
  question:     "Posts that open with a question to hook viewers",
  statistic:    "Posts leading with a compelling data point or stat",
  controversy:  "Posts that challenge conventional wisdom or spark debate",
  story:        "Posts built around a narrative or personal story",
  cta:          "Posts with a strong call to action driving engagement",
  trend:        "Posts tapping into trending topics or formats",
  educational:  "Posts that teach, explain, or inform the audience",
  emotional:    "Posts that connect on an emotional or relatable level",
  other:        "Posts with a varied or unclassified hook style",
};

// Stop words to filter out when extracting keywords from captions
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "is","are","was","were","be","been","have","has","had","do","does","did",
  "will","would","could","should","may","might","can","this","that","these",
  "those","i","you","we","they","he","she","it","my","your","our","their",
  "its","me","him","her","us","them","what","which","who","when","where","how",
  "not","no","so","if","as","from","up","about","into","than","then","just",
  "like","get","got","make","made","know","want","need","look","come","go",
  "also","out","more","all","there","here","new","one","two","time","way",
]);

function extractKeywords(captions: string[]): string[] {
  const freq = new Map<string, number>();
  for (const caption of captions) {
    const words = caption
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

function extractHashtags(hashtagArrays: string[][]): string[] {
  const freq = new Map<string, number>();
  for (const tags of hashtagArrays) {
    for (const tag of tags) {
      const t = tag.toLowerCase().replace(/^#/, "");
      if (t) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);
}

export async function POST() {
  try {
    // Fetch all posts with the fields we need
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        platform: true,
        contentType: true,
        hookType: true,
        caption: true,
        hashtags: true,
        engagementRate: true,
      },
    });

    if (posts.length === 0) {
      return NextResponse.json({ message: "No posts found to seed from", pillarsCreated: 0, ideasCreated: 0 });
    }

    // Group posts by hookType → platform
    const byHook = new Map<string, Map<string, typeof posts>>();
    for (const post of posts) {
      const hook = post.hookType || "other";
      if (!byHook.has(hook)) byHook.set(hook, new Map());
      const byPlatform = byHook.get(hook)!;
      if (!byPlatform.has(post.platform)) byPlatform.set(post.platform, []);
      byPlatform.get(post.platform)!.push(post);
    }

    // Fetch existing pillars so we don't duplicate
    const existingPillars = await prisma.contentPillar.findMany({ select: { name: true } });
    const existingNames = new Set(existingPillars.map((p) => p.name));

    let pillarsCreated = 0;
    let ideasCreated = 0;
    let sortOrder = existingPillars.length;

    for (const [hookType, platformMap] of byHook) {
      const pillarName = HOOK_LABELS[hookType] ?? hookType;

      // Create pillar if it doesn't exist
      let pillar = await prisma.contentPillar.findFirst({ where: { name: pillarName } });
      if (!pillar) {
        pillar = await prisma.contentPillar.create({
          data: {
            name: pillarName,
            description: HOOK_DESCRIPTIONS[hookType] ?? null,
            color: HOOK_COLORS[hookType] ?? "#6366f1",
            sortOrder: sortOrder++,
          },
        });
        pillarsCreated++;
      }

      // Fetch existing ideas for this pillar to avoid duplication
      const existingIdeas = await prisma.postIdea.findMany({
        where: { pillarId: pillar.id },
        select: { title: true },
      });
      const existingIdeaTitles = new Set(existingIdeas.map((i) => i.title));

      // Create one idea per platform (only if it doesn't already exist)
      for (const [platform, platformPosts] of platformMap) {
        const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
        const ideaTitle = `${platformLabel} — ${pillarName}`;

        if (existingIdeaTitles.has(ideaTitle)) continue;

        const hashtags = extractHashtags(platformPosts.map((p) => p.hashtags));
        const keywords = extractKeywords(platformPosts.map((p) => p.caption));

        // Find the most common contentType for this group
        const ctFreq = new Map<string, number>();
        for (const p of platformPosts) {
          ctFreq.set(p.contentType, (ctFreq.get(p.contentType) ?? 0) + 1);
        }
        const topContentType = [...ctFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        await prisma.postIdea.create({
          data: {
            pillarId: pillar.id,
            title: ideaTitle,
            notes: `Auto-generated from ${platformPosts.length} existing ${platform} post${platformPosts.length !== 1 ? "s" : ""} using the "${hookType}" hook type.`,
            platform,
            contentType: topContentType,
            hookType,
            targetHashtags: hashtags,
            keywords,
            status: "idea",
          },
        });
        ideasCreated++;
      }
    }

    return NextResponse.json({
      message: `Seeded ${pillarsCreated} pillar${pillarsCreated !== 1 ? "s" : ""} and ${ideasCreated} idea${ideasCreated !== 1 ? "s" : ""} from ${posts.length} posts`,
      pillarsCreated,
      ideasCreated,
      postsAnalysed: posts.length,
    });
  } catch (err) {
    console.error("[mindmap/seed] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Seed failed" }, { status: 500 });
  }
}
