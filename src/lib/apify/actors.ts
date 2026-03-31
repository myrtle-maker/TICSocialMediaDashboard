import type { Platform } from "@/types/social";
import { APIFY_ACTORS } from "@/lib/constants";

export interface ActorConfig {
  actorId: string;
  label: string;
  buildInput: (handle: string, maxPosts: number) => Record<string, unknown>;
}

export const ACTOR_CONFIGS: Record<Platform, ActorConfig> = {
  tiktok: {
    actorId: APIFY_ACTORS.tiktok.id,
    label: APIFY_ACTORS.tiktok.label,
    buildInput: (handle: string, maxPosts: number) => ({
      profiles: [handle],
      resultsPerPage: maxPosts,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    }),
  },

  instagram: {
    actorId: APIFY_ACTORS.instagram.id,
    label: APIFY_ACTORS.instagram.label,
    buildInput: (handle: string, maxPosts: number) => ({
      directUrls: [`https://www.instagram.com/${handle}/`],
      resultsType: "posts",
      resultsLimit: maxPosts,
      searchType: "user",
      searchLimit: 1,
    }),
  },

  youtube: {
    actorId: APIFY_ACTORS.youtube.id,
    label: APIFY_ACTORS.youtube.label,
    buildInput: (handle: string, maxPosts: number) => ({
      startUrls: [
        { url: `https://www.youtube.com/@${handle}/videos` },
        { url: `https://www.youtube.com/@${handle}/shorts` },
      ],
      maxResults: maxPosts,
      sortBy: "date",
    }),
  },

  twitter: {
    actorId: APIFY_ACTORS.twitter.id,
    label: APIFY_ACTORS.twitter.label,
    buildInput: (handle: string, maxPosts: number) => ({
      startUrls: [{ url: `https://twitter.com/${handle}` }],
      tweetsDesired: maxPosts,
      includeReplies: false,
      includeRetweets: false,
      proxyConfig: { useApifyProxy: true },
    }),
  },

  facebook: {
    actorId: APIFY_ACTORS.facebook.id,
    label: APIFY_ACTORS.facebook.label,
    buildInput: (handle: string, maxPosts: number) => ({
      startUrls: [{ url: `https://www.facebook.com/${handle}` }],
      resultsLimit: maxPosts,
    }),
  },

  linkedin: {
    actorId: APIFY_ACTORS.linkedin.id,
    label: APIFY_ACTORS.linkedin.label,
    buildInput: (handle: string, maxPosts: number) => ({
      urls: [`https://www.linkedin.com/company/${handle}/`],
      limitPerCompany: maxPosts,
    }),
  },
};
