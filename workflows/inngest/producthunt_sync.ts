/**
 * Product Hunt Data Sync
 *
 * Scheduled tasks to sync Product Hunt data to cache for better performance
 * and reduced API calls.
 *
 * Jobs:
 * - phTrendingSync: Sync trending posts every 30 minutes
 * - phTopicsSync: Sync topics once a day
 * - phCacheWarm: Warm cache on demand
 */

import { inngest } from "./client";

const THIRD_PARTY_SERVICE_URL = process.env.THIRD_PARTY_SERVICE_URL || "http://localhost:8007";

// ===========================================
// Trending Posts Sync (Every 30 minutes)
// ===========================================

export const phTrendingSync = inngest.createFunction(
  {
    id: "ph-trending-sync",
    name: "Product Hunt Trending Sync",
  },
  { cron: "*/30 * * * *" }, // Every 30 minutes
  async ({ step, logger }) => {
    logger.info("Starting Product Hunt trending sync...");

    // Step 1: Fetch and cache trending posts (all topics)
    const trendingResult = await step.run("sync-trending-all", async () => {
      const response = await fetch(
        `${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/posts/trending?first=20`,
      );

      if (!response.ok) {
        throw new Error(`Failed to sync trending: ${response.status}`);
      }

      const data = await response.json();
      return {
        count: data.posts?.length || 0,
        cached: data.cached,
      };
    });

    // Step 2: Sync trending for key topics
    const topics = ["ai", "saas", "developer-tools", "web3", "productivity"];

    const topicResults = await step.run("sync-trending-topics", async () => {
      const results: Record<string, number> = {};

      for (const topic of topics) {
        try {
          const response = await fetch(
            `${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/posts/trending?first=10&topic=${topic}`,
          );

          if (response.ok) {
            const data = await response.json();
            results[topic] = data.posts?.length || 0;
          } else {
            results[topic] = -1; // Error
          }
        } catch {
          results[topic] = -1;
        }

        // Small delay between requests
        await new Promise((r) => setTimeout(r, 500));
      }

      return results;
    });

    logger.info("Product Hunt trending sync completed", {
      trending: trendingResult,
      topics: topicResults,
    });

    return {
      success: true,
      trending: trendingResult,
      topics: topicResults,
      syncedAt: new Date().toISOString(),
    };
  },
);

// ===========================================
// Topics Sync (Once daily)
// ===========================================

export const phTopicsSync = inngest.createFunction(
  {
    id: "ph-topics-sync",
    name: "Product Hunt Topics Sync",
  },
  { cron: "0 0 * * *" }, // Every day at midnight
  async ({ step, logger }) => {
    logger.info("Starting Product Hunt topics sync...");

    // Step 1: Sync all topics
    const topicsResult = await step.run("sync-topics", async () => {
      const response = await fetch(
        `${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/topics?first=100`,
      );

      if (!response.ok) {
        throw new Error(`Failed to sync topics: ${response.status}`);
      }

      const data = await response.json();
      return {
        count: data.topics?.length || 0,
        cached: data.cached,
      };
    });

    // Step 2: Sync collections
    const collectionsResult = await step.run("sync-collections", async () => {
      const response = await fetch(
        `${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/collections?first=20`,
      );

      if (!response.ok) {
        throw new Error(`Failed to sync collections: ${response.status}`);
      }

      const data = await response.json();
      return {
        count: data.collections?.length || 0,
        cached: data.cached,
      };
    });

    logger.info("Product Hunt topics sync completed", {
      topics: topicsResult,
      collections: collectionsResult,
    });

    return {
      success: true,
      topics: topicsResult,
      collections: collectionsResult,
      syncedAt: new Date().toISOString(),
    };
  },
);

// ===========================================
// Cache Warm (On-demand)
// ===========================================

export const phCacheWarm = inngest.createFunction(
  {
    id: "ph-cache-warm",
    name: "Product Hunt Cache Warm",
  },
  { event: "integrations/producthunt.warm" },
  async ({ step, logger }) => {
    logger.info("Warming Product Hunt cache...");

    const result = await step.run("warm-cache", async () => {
      const response = await fetch(`${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/cache/warm`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to warm cache: ${response.status}`);
      }

      return await response.json();
    });

    logger.info("Product Hunt cache warmed", result);

    return {
      success: true,
      warmed: result.warmed,
      warmedAt: new Date().toISOString(),
    };
  },
);

// ===========================================
// Full Sync (Weekly comprehensive sync)
// ===========================================

export const phFullSync = inngest.createFunction(
  {
    id: "ph-full-sync",
    name: "Product Hunt Full Sync",
  },
  { cron: "0 2 * * 0" }, // Every Sunday at 2 AM
  async ({ step, logger }) => {
    logger.info("Starting Product Hunt full sync...");

    // Step 1: Invalidate existing cache
    await step.run("invalidate-cache", async () => {
      const response = await fetch(`${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/cache`, {
        method: "DELETE",
      });

      if (!response.ok) {
        logger.warn("Failed to invalidate cache, continuing anyway");
      }

      return { invalidated: response.ok };
    });

    // Step 2: Warm cache with fresh data
    const warmResult = await step.run("warm-fresh-cache", async () => {
      const response = await fetch(`${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/cache/warm`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to warm cache: ${response.status}`);
      }

      return await response.json();
    });

    // Step 3: Sync trending for multiple topics
    const topics = [
      "ai",
      "saas",
      "developer-tools",
      "web3",
      "productivity",
      "marketing",
      "design",
      "fintech",
    ];

    const topicResults = await step.run("sync-all-topics", async () => {
      const results: Record<string, number> = {};

      for (const topic of topics) {
        try {
          const response = await fetch(
            `${THIRD_PARTY_SERVICE_URL}/api/v1/producthunt/posts?first=20&topic=${topic}&order=VOTES`,
          );

          if (response.ok) {
            const data = await response.json();
            results[topic] = data.posts?.length || 0;
          } else {
            results[topic] = -1;
          }
        } catch {
          results[topic] = -1;
        }

        // Delay between requests to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1000));
      }

      return results;
    });

    logger.info("Product Hunt full sync completed", {
      warmed: warmResult,
      topics: topicResults,
    });

    return {
      success: true,
      warmed: warmResult.warmed,
      topics: topicResults,
      syncedAt: new Date().toISOString(),
    };
  },
);
