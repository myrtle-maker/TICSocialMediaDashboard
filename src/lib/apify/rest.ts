/**
 * Apify REST API wrapper using fetch.
 * Avoids the apify-client npm package which has bundling issues on Vercel.
 */

const BASE = "https://api.apify.com/v2";

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
    finishedAt: string | null;
  };
}

interface ApifyDatasetResponse {
  data: {
    items: Record<string, unknown>[];
  };
}

export async function startActorRun(
  token: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<{ runId: string; datasetId: string; status: string }> {
  // actorId like "clockworks/tiktok-scraper" needs to be encoded
  const encodedActorId = actorId.replace("/", "~");

  const res = await fetch(`${BASE}/acts/${encodedActorId}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify API error (${res.status}): ${text}`);
  }

  const json = (await res.json()) as ApifyRunResponse;

  return {
    runId: json.data.id,
    datasetId: json.data.defaultDatasetId,
    status: json.data.status,
  };
}

export async function getRunStatus(
  token: string,
  runId: string
): Promise<{ status: string; datasetId: string; finishedAt: string | null }> {
  const res = await fetch(`${BASE}/actor-runs/${runId}?token=${token}`);

  if (!res.ok) {
    throw new Error(`Failed to get run status: ${res.status}`);
  }

  const json = (await res.json()) as ApifyRunResponse;

  return {
    status: json.data.status,
    datasetId: json.data.defaultDatasetId,
    finishedAt: json.data.finishedAt,
  };
}

export async function getDatasetItems(
  token: string,
  datasetId: string,
  limit = 100
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${BASE}/datasets/${datasetId}/items?token=${token}&limit=${limit}&format=json`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch dataset: ${res.status}`);
  }

  const items = await res.json();
  return Array.isArray(items) ? items : [];
}
