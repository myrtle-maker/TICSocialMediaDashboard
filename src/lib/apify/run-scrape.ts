import type { Platform } from "@/types/social";
import { getApifyClient } from "./client";
import { ACTOR_CONFIGS } from "./actors";

export interface RunScrapeOptions {
  platform: Platform;
  handle: string;
  maxPosts?: number;
  /** Optional memory in MB for the actor run */
  memoryMbytes?: number;
  /** Optional timeout in seconds for the actor run */
  timeoutSecs?: number;
}

export interface RunScrapeResult {
  runId: string;
  actorId: string;
  datasetId: string;
  status: string;
}

/**
 * Triggers an Apify actor run for the specified platform and handle.
 * Returns the run ID and dataset ID for later result fetching.
 */
export async function runScrape(
  options: RunScrapeOptions
): Promise<RunScrapeResult> {
  const {
    platform,
    handle,
    maxPosts = 50,
    memoryMbytes,
    timeoutSecs,
  } = options;

  const config = ACTOR_CONFIGS[platform];
  if (!config) {
    throw new Error(`No actor configuration found for platform: ${platform}`);
  }

  const client = getApifyClient();
  const input = config.buildInput(handle, maxPosts);

  const run = await client.actor(config.actorId).call(input, {
    ...(memoryMbytes && { memoryMbytes }),
    ...(timeoutSecs && { timeoutSecs }),
    waitSecs: 0, // Do not wait for completion; return immediately
  });

  return {
    runId: run.id,
    actorId: config.actorId,
    datasetId: run.defaultDatasetId,
    status: run.status,
  };
}
