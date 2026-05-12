export { inngest } from "./client";

import { autoTranslate } from "./auto_translate";
import { dailyDigestEmail, weeklyTenantReport } from "./daily_digest_email";
import { dailyDbBackup, onDemandBackup } from "./db_backup";

// Re-export all functions
export { autoTranslate, dailyDbBackup, dailyDigestEmail, onDemandBackup, weeklyTenantReport };

// Export all functions for Inngest serve
export const functions = [
  // AI/Translation
  autoTranslate,
  // Notifications
  dailyDigestEmail,
  weeklyTenantReport,
  // Infrastructure
  dailyDbBackup,
  onDemandBackup,
];
