import Anthropic from "@anthropic-ai/sdk";
import { getAnalyticsContext } from "@/lib/analytics/context";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your environment variables.",
      },
      { status: 400 }
    );
  }

  let focus: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.focus === "string") focus = body.focus;
  } catch {
    // no body is fine
  }

  try {
    const context = await getAnalyticsContext();

    if (context.summary.postCount < 20) {
      return Response.json(
        {
          error: `Need more data to generate a meaningful briefing. You currently have ${context.summary.postCount} posts — at least 20 are required. Keep scraping content to build up your dataset.`,
        },
        { status: 400 }
      );
    }

    const focusInstruction = focus
      ? `\n\nThe team has requested this briefing focus specifically on: **${focus}**. Weight your analysis and recommendations toward this goal.`
      : "";

    const systemPrompt = `You are a senior social media strategist working for a company that manages multiple social media accounts. You have deep expertise in content strategy, audience engagement, and platform-specific best practices.

Your task is to write a concise, actionable weekly strategy briefing based on the analytics data provided. Write in a professional but direct tone — like a strategist briefing a CEO.${focusInstruction}

Use markdown formatting:
- Use **bold** for key metrics and important points
- Use bullet points for lists
- Use ### for section headers
- Keep each section tight — no filler

Structure your briefing with these sections:
### Weekly Performance Summary
### What's Working (and Why)
### What's Not Working (and Why)
### Content Recommendations for Next Week
### Platform-Specific Advice
### This Week's Top 3 Actions

For "What's Working" and "What's Not Working", reference specific posts by their hook text when available.
For "Content Recommendations", be specific — suggest actual caption hooks, content types, hashtags, and posting times based on the data.
For "This Week's Top 3 Actions", give exactly 3 numbered, concrete, immediately actionable tasks the team should do this week — prioritised by expected impact.`;

    const fmt = (rate: number) => `${(rate * 100).toFixed(2)}%`;

    const userPrompt = `Here is the analytics data for the last 90 days:

**Summary:**
- ${context.summary.postCount} posts analyzed
- Date range: ${context.summary.dateFrom.split("T")[0]} to ${context.summary.dateTo.split("T")[0]}
- Platforms: ${context.summary.platforms.join(", ")}
- Accounts tracked: ${context.summary.accountCount}
- Overall trend: ${context.overallTrend}

**Top Algorithmic Insights:**
${context.topInsights
  .map(
    (i, idx) =>
      `${idx + 1}. [${i.priority.toUpperCase()}] ${i.title}: ${i.description}${i.recommendation ? ` → ${i.recommendation}` : ""}`
  )
  .join("\n")}

**Platform Stats:**
${context.platformStats
  .map(
    (p) =>
      `- ${p.label}: ${p.postCount} posts, avg ER ${fmt(p.avgEngagementRate)}, avg views ${Math.round(p.avgViews).toLocaleString()}, best content type: ${p.bestContentType ?? "N/A"}, best hook type: ${p.bestHookType ?? "N/A"}`
  )
  .join("\n")}

**Content Type Performance:**
${context.contentTypeStats
  .map(
    (c) =>
      `- ${c.contentType}: ${c.postCount} posts, avg ER ${fmt(c.avgEngagementRate)}, avg views ${Math.round(c.avgViews).toLocaleString()}`
  )
  .join("\n")}

**Hook Type Rankings (best to worst):**
${context.hookTypeRankings
  .map(
    (h, i) =>
      `${i + 1}. ${h.hookType}: avg ER ${fmt(h.avgEngagementRate)} (${h.postCount} posts)`
  )
  .join("\n")}

**Top Hashtags by Engagement Rate:**
${context.topHashtags.length > 0
  ? context.topHashtags
      .map(
        (h) =>
          `- ${h.hashtag}: avg ER ${fmt(h.avgEngagementRate)}, ${h.postCount} posts, ${Math.round(h.totalViews).toLocaleString()} total views`
      )
      .join("\n")
  : "No hashtag data available."}

**Best Posting Days (UTC):**
${context.bestPostingDays.length > 0
  ? context.bestPostingDays.map((d) => `- ${d.label}: avg ER ${fmt(d.avgEngagementRate)}`).join("\n")
  : "Insufficient data."}

**Best Posting Hours (UTC):**
${context.bestPostingHours.length > 0
  ? context.bestPostingHours.map((h) => `- ${h.label}: avg ER ${fmt(h.avgEngagementRate)}`).join("\n")
  : "Insufficient data."}

**Top 10 Posts (by Engagement Rate):**
${context.topPosts
  .map(
    (p, i) =>
      `${i + 1}. [${p.platform}/${p.contentType}] Hook: "${p.hookText}" | ER: ${fmt(p.engagementRate)} | Views: ${p.views.toLocaleString()} | Hook type: ${p.hookType} | Published: ${p.publishedAt.split("T")[0]}`
  )
  .join("\n")}

**Bottom 10 Posts (by Engagement Rate):**
${context.bottomPosts
  .map(
    (p, i) =>
      `${i + 1}. [${p.platform}/${p.contentType}] Hook: "${p.hookText}" | ER: ${fmt(p.engagementRate)} | Views: ${p.views.toLocaleString()} | Hook type: ${p.hookType} | Published: ${p.publishedAt.split("T")[0]}`
  )
  .join("\n")}

Write the strategy briefing now.`;

    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
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
              controller.enqueue(
                new TextEncoder().encode(event.delta.text)
              );
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
    console.error("AI Briefing error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        error: `Failed to generate briefing: ${message}. Check your Anthropic API key and try again.`,
      },
      { status: 500 }
    );
  }
}
