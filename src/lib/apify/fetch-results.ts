import { getApifyClient } from "./client";

export interface FetchResultsOptions {
  datasetId: string;
  /** Maximum number of items to fetch. Defaults to 1000. */
  limit?: number;
  /** Offset for pagination. Defaults to 0. */
  offset?: number;
}

/**
 * Fetches dataset items from a completed Apify actor run.
 * Returns an array of raw result objects from the dataset.
 */
export async function fetchResults<T = Record<string, unknown>>(
  options: FetchResultsOptions
): Promise<T[]> {
  const { datasetId, limit = 1000, offset = 0 } = options;

  const client = getApifyClient();
  const dataset = client.dataset(datasetId);

  const { items } = await dataset.listItems({
    limit,
    offset,
  });

  return items as T[];
}

/**
 * Checks whether an Apify run has finished and returns its current status.
 */
export async function getRunStatus(
  runId: string
): Promise<{
  status: string;
  datasetId: string;
  finishedAt: Date | null;
}> {
  const client = getApifyClient();
  const run = await client.run(runId).get();

  if (!run) {
    throw new Error(`Apify run not found: ${runId}`);
  }

  return {
    status: run.status,
    datasetId: run.defaultDatasetId,
    finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
  };
}
