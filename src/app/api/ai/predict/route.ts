import Anthropic from "@anthropic-ai/sdk";
import { getAnalyticsContext } from "@/lib/analytics/context";

interface PredictRequest {
  caption: string;
  platform?: string;
  contentType?: string;
}

interface PredictResponse {
  score: number;
  reasons: string[];
  suggestions: string[];
  confidence: "high" | "medium" | "low";
}

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

  let body: PredictRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { caption, platform, contentType } = body;

  if (!caption || typeof caption !== "string" || caption.trim().length === 0) {
    return Response.json(
      { error: "Caption is required." },
      { status: 400 }
    );
  }

  if (caption.length > 2000) {
    return Response.json(
      { error: "Caption must be 2000 characters or fewer." },
      { status: 400 }
    );
  }

  try {
    const context = await getAnalyticsContext();

    const systemPrompt = `You are a social media performance prediction engine. You analyze caption text against historical performance data to predict how well a post will perform.

You MUST respond with valid JSON only — no markdown, no explanation outside the JSON. The schema:
{
  "score": <number 0-100>,
  "reasons": [<string>, <string>, <string>],
  "suggestions": [<string>, <string>],
  "confidence": "high" | "medium" | "low"
}

Scoring guide:
- 0-20: Very poor — generic, no hook, no value
- 21-40: Below average — weak hook, unclear CTA
- 41-60: Average — decent hook, could be improved
- 61-80: Good — strong hook, clear value, matches top patterns
- 81-100: Excellent — mirrors top-performing patterns closely

Set confidence based on how much historical data matches the content type and platform:
- "high": 30+ posts in same platform/content type
- "medium": 10-29 posts
- "low": fewer than 10 posts`;

    const userPrompt = `Analyze this caption and predict its performance based on historical data.

**Caption to analyze:**
"${caption}"

${platform ? `**Target platform:** ${platform}` : ""}
${contentType ? `**Content type:** ${contentType}` : ""}

**Historical performance context (last 90 days):**
- ${context.summary.postCount} posts analyzed across ${context.summary.platforms.join(", ")}
- Overall trend: ${context.overallTrend}

**Platform stats:**
${context.platformStats
  .map(
    (p) =>
      `- ${p.label}: avg ER ${(p.avgEngagementRate * 100).toFixed(2)}%, best hook: ${p.bestHookType ?? "N/A"}, best content: ${p.bestContentType ?? "N/A"}`
  )
  .join("\n")}

**Top performing hooks:**
${context.topPosts
  .map(
    (p) =>
      `- "${p.hookText}" (${p.hookType}, ER: ${(p.engagementRate * 100).toFixed(2)}%)`
  )
  .join("\n")}

**Worst performing hooks:**
${context.bottomPosts
  .map(
    (p) =>
      `- "${p.hookText}" (${p.hookType}, ER: ${(p.engagementRate * 100).toFixed(2)}%)`
  )
  .join("\n")}

**Key insights:**
${context.topInsights
  .slice(0, 5)
  .map((i) => `- ${i.title}: ${i.description}`)
  .join("\n")}

Return ONLY the JSON response.`;

    const client = new Anthropic({ apiKey });

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";

        // Parse the JSON from the response — handle potential markdown wrapping
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const parsed: PredictResponse = JSON.parse(jsonMatch[0]);

        // Validate and clamp
        const result: PredictResponse = {
          score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 50))),
          reasons: Array.isArray(parsed.reasons)
            ? parsed.reasons.slice(0, 5)
            : ["Unable to determine specific reasons."],
          suggestions: Array.isArray(parsed.suggestions)
            ? parsed.suggestions.slice(0, 5)
            : ["Try different hook styles."],
          confidence: ["high", "medium", "low"].includes(parsed.confidence)
            ? parsed.confidence
            : "medium",
        };

        return Response.json(result);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Retry on rate limit (429)
        if (
          lastError.message.includes("429") ||
          lastError.message.includes("rate")
        ) {
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1000 * attempts));
            continue;
          }
        }
        break;
      }
    }

    console.error("AI Predict error:", lastError);
    return Response.json(
      {
        error: `Failed to predict performance: ${lastError?.message ?? "Unknown error"}. Please try again.`,
      },
      { status: 500 }
    );
  } catch (err) {
    console.error("AI Predict error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Failed to predict performance: ${message}` },
      { status: 500 }
    );
  }
}
