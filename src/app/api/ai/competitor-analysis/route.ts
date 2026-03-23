import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your environment variables." },
      { status: 400 }
    );
  }

  try {
    // Gather your data
    const yourPosts = await prisma.post.findMany({
      select: {
        engagementRate: true,
        hookType: true,
        contentType: true,
        platform: true,
        views: true,
        likes: true,
        shares: true,
        saves: true,
        comments: true,
      },
    });

    // Gather competitor data
    const competitors = await prisma.competitor.findMany({
      include: {
        posts: {
          select: {
            engagementRate: true,
            hookType: true,
            contentType: true,
            platform: true,
            views: true,
            likes: true,
            shares: true,
            saves: true,
            comments: true,
          },
        },
      },
    });

    if (yourPosts.length < 5 && competitors.every((c) => c.posts.length < 5)) {
      return Response.json(
        { error: "Need more data. Scrape your accounts and competitors first." },
        { status: 400 }
      );
    }

    // Build summary stats
    function summarize(posts: typeof yourPosts) {
      if (posts.length === 0) return { postCount: 0, avgER: 0, avgViews: 0, topContentTypes: [] as string[], topHookTypes: [] as string[] };
      const avgER = posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length;
      const avgViews = posts.reduce((s, p) => s + p.views, 0) / posts.length;

      const ctMap = new Map<string, number>();
      const htMap = new Map<string, number>();
      for (const p of posts) {
        ctMap.set(p.contentType, (ctMap.get(p.contentType) ?? 0) + 1);
        htMap.set(p.hookType, (htMap.get(p.hookType) ?? 0) + 1);
      }
      const topContentTypes = [...ctMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
      const topHookTypes = [...htMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

      return { postCount: posts.length, avgER: parseFloat(avgER.toFixed(2)), avgViews: Math.round(avgViews), topContentTypes, topHookTypes };
    }

    const yourSummary = summarize(yourPosts);
    const competitorSummaries = competitors.map((c) => ({
      name: c.displayName,
      handle: c.handle,
      platform: c.platform,
      ...summarize(c.posts),
    }));

    const systemPrompt = `You are a competitive intelligence analyst specializing in social media. Analyze the data and provide a concise gap analysis with specific, actionable insights.

Use markdown formatting:
- Use **bold** for emphasis
- Use bullet points
- Keep it concise - max 400 words
- Be specific with numbers and percentages`;

    const userPrompt = `Compare our social media performance against competitors:

**Our Performance:**
- ${yourSummary.postCount} posts analyzed
- Avg engagement rate: ${yourSummary.avgER}%
- Avg views: ${yourSummary.avgViews.toLocaleString()}
- Top content types: ${yourSummary.topContentTypes.join(", ") || "N/A"}
- Top hook types: ${yourSummary.topHookTypes.join(", ") || "N/A"}

**Competitors:**
${competitorSummaries.map((c) => `- ${c.name} (@${c.handle}, ${c.platform}): ${c.postCount} posts, avg ER ${c.avgER}%, avg views ${c.avgViews.toLocaleString()}, top content: ${c.topContentTypes.join(", ") || "N/A"}, top hooks: ${c.topHookTypes.join(", ") || "N/A"}`).join("\n")}

Provide:
1. Key gaps between us and competitors
2. What competitors are doing better
3. Specific tactical recommendations to close gaps
4. Quick wins we can implement immediately`;

    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Competitor analysis error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Failed to generate analysis: ${message}` },
      { status: 500 }
    );
  }
}
