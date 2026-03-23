import type { HookType } from "@/types/social";

/**
 * Classifies caption text into a HookType based on linguistic patterns.
 * Checks rules in priority order and returns the first match.
 */
export function classifyHook(caption: string): HookType {
  if (!caption || caption.trim().length === 0) return "other";

  const text = caption.trim();
  const lower = text.toLowerCase();

  // --- Question ---
  if (isQuestion(lower, text)) return "question";

  // --- Statistic ---
  if (isStatistic(lower)) return "statistic";

  // --- Controversy ---
  if (isControversy(lower)) return "controversy";

  // --- Story ---
  if (isStory(lower, text)) return "story";

  // --- CTA ---
  if (isCta(lower)) return "cta";

  // --- Trend ---
  if (isTrend(lower)) return "trend";

  // --- Educational ---
  if (isEducational(lower)) return "educational";

  // --- Emotional ---
  if (isEmotional(text)) return "emotional";

  return "other";
}

function isQuestion(lower: string, original: string): boolean {
  if (original.includes("?")) return true;

  const questionStarters = [
    "who ",
    "what ",
    "when ",
    "where ",
    "why ",
    "how ",
    "who's",
    "what's",
    "when's",
    "where's",
    "why's",
    "how's",
  ];
  return questionStarters.some((s) => lower.startsWith(s));
}

function isStatistic(lower: string): boolean {
  // Match numbers followed by %
  if (/\d+(\.\d+)?%/.test(lower)) return true;

  // Match "X out of Y" patterns
  if (/\d+\s+out\s+of\s+\d+/i.test(lower)) return true;

  // Match "X in Y" stat patterns like "1 in 3"
  if (/\d+\s+in\s+\d+/.test(lower)) return true;

  return false;
}

function isControversy(lower: string): boolean {
  const patterns = [
    "unpopular opinion",
    "hot take",
    "nobody talks about",
    "controversial",
    "i don't care what anyone says",
    "fight me on this",
    "i said what i said",
    "this might be controversial",
    "prepare to be triggered",
    "unfiltered truth",
  ];
  return patterns.some((p) => lower.includes(p));
}

function isStory(lower: string, original: string): boolean {
  const storyStarters = [
    "i ",
    "we ",
    "my ",
    "story time",
    "storytime",
    "let me tell you",
    "so this happened",
    "you won't believe",
    "true story",
  ];
  if (storyStarters.some((s) => lower.startsWith(s))) return true;

  // Past tense narrative detection: look for common past-tense verbs early in text
  const firstLine = lower.split("\n")[0] ?? "";
  const pastTensePatterns =
    /\b(went|saw|found|got|made|told|asked|happened|realized|discovered|learned|noticed)\b/;
  if (pastTensePatterns.test(firstLine) && firstLine.length < 200)
    return true;

  return false;
}

function isCta(lower: string): boolean {
  const patterns = [
    "follow ",
    "follow me",
    "save this",
    "save for later",
    "share this",
    "comment below",
    "link in bio",
    "link in the bio",
    "drop a comment",
    "tag someone",
    "tag a friend",
    "double tap",
    "turn on notifications",
    "subscribe",
    "hit the bell",
    "smash the like",
    "like and subscribe",
  ];
  return patterns.some((p) => lower.includes(p));
}

function isTrend(lower: string): boolean {
  const patterns = [
    "pov:",
    "pov ",
    "when you ",
    "#trend",
    "#trending",
    "this trend",
    "new trend",
    "trend alert",
    "trying this trend",
    "let's try this",
    "jumping on this",
  ];
  return patterns.some((p) => lower.includes(p));
}

function isEducational(lower: string): boolean {
  const patterns = [
    "how to ",
    "ways to ",
    "guide to ",
    "tip:",
    "tips:",
    "tips for",
    "learn ",
    "tutorial",
    "step by step",
    "step-by-step",
    "here's how",
    "here is how",
    "did you know",
    "pro tip",
    "beginner",
    "things you need to know",
    "mistakes to avoid",
    "things i wish",
  ];
  // Also match "X ways to", "X tips", "X things" at start
  if (/^\d+\s+(ways?|tips?|things?|steps?|reasons?|hacks?|tricks?)\b/.test(lower))
    return true;

  return patterns.some((p) => lower.includes(p));
}

function isEmotional(original: string): boolean {
  // Count exclamation marks
  const exclamationCount = (original.match(/!/g) ?? []).length;
  if (exclamationCount >= 3) return true;

  // Count ALL CAPS words (3+ chars)
  const words = original.split(/\s+/);
  const capsWords = words.filter(
    (w) => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
  );
  if (capsWords.length >= 3) return true;

  // Emotional language patterns
  const lower = original.toLowerCase();
  const emotionalPatterns = [
    "i can't believe",
    "this broke me",
    "i'm crying",
    "i'm screaming",
    "i'm shaking",
    "this is insane",
    "absolutely incredible",
    "life changing",
    "life-changing",
    "mind blown",
    "mind-blown",
    "speechless",
    "obsessed",
    "game changer",
    "game-changer",
  ];
  if (emotionalPatterns.some((p) => lower.includes(p))) return true;

  // Heavy emoji usage as emotional signal (5+ emojis)
  const emojiCount = (
    original.match(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
    ) ?? []
  ).length;
  if (emojiCount >= 5) return true;

  return false;
}
