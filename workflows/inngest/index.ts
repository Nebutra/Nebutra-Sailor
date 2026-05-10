export { inngest } from "./client";

import { autoTranslate } from "./auto_translate";
import { dailyDigestEmail, weeklyTenantReport } from "./daily_digest_email";
import { dailyDbBackup, onDemandBackup } from "./db_backup";
import { inventorySync, processShopifyOrder } from "./ecommerce_sync";
import { phCacheWarm, phFullSync, phTopicsSync, phTrendingSync } from "./producthunt_sync";
import { recsysRefresh, userProfileUpdate } from "./recsys_refresh";

// Re-export all functions
export {
  autoTranslate,
  dailyDbBackup,
  dailyDigestEmail,
  inventorySync,
  onDemandBackup,
  phCacheWarm,
  phFullSync,
  phTopicsSync,
  phTrendingSync,
  processShopifyOrder,
  recsysRefresh,
  userProfileUpdate,
  weeklyTenantReport,
};

// Export all functions for Inngest serve
export const functions = [
  // AI/Translation
  autoTranslate,
  // Recommendations
  recsysRefresh,
  userProfileUpdate,
  // E-commerce
  inventorySync,
  processShopifyOrder,
  // Notifications
  dailyDigestEmail,
  weeklyTenantReport,
  // Infrastructure
  dailyDbBackup,
  onDemandBackup,
  // Third-party
  phTrendingSync,
  phTopicsSync,
  phCacheWarm,
  phFullSync,
];
