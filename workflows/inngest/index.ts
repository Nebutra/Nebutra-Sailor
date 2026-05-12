export { inngest } from "./client";

import { autoTranslate } from "./auto_translate";
import { dailyDigestEmail, weeklyTenantReport } from "./daily_digest_email";
import { dailyDbBackup, onDemandBackup } from "./db_backup";
import { inventorySync, processShopifyOrder } from "./ecommerce_sync";

// Re-export all functions
export {
  autoTranslate,
  dailyDbBackup,
  dailyDigestEmail,
  inventorySync,
  onDemandBackup,
  processShopifyOrder,
  weeklyTenantReport,
};

// Export all functions for Inngest serve
export const functions = [
  // AI/Translation
  autoTranslate,
  // E-commerce
  inventorySync,
  processShopifyOrder,
  // Notifications
  dailyDigestEmail,
  weeklyTenantReport,
  // Infrastructure
  dailyDbBackup,
  onDemandBackup,
];
