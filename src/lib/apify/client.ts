import { ApifyClient } from "apify-client";

let client: ApifyClient | null = null;

export function getApifyClient(): ApifyClient {
  if (!client) {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error(
        "APIFY_API_TOKEN environment variable is not set. " +
          "Please add it to your .env.local file."
      );
    }
    client = new ApifyClient({ token });
  }
  return client;
}
