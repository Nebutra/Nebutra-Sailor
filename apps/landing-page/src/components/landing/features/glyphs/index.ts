/**
 * Sub-package glyph registry.
 *
 * Each glyph is a bespoke ~160px thumbnail that hints at what a specific
 * sub-package does. Rendered at the top of a sub-package card on the
 * parent group's detail page (e.g. /zh/features/integrations).
 *
 * Lookup: `getSubpackageGlyph(slug)` → component or null.
 *
 * Current coverage: integrations group (17 sub-packages). Other groups
 * fall back to the generic [Icon] ${slug} identity row.
 */

import { AdminToolingGlyph } from "./admin-tooling-glyph";
import { CacheGlyph } from "./cache-glyph";
import { CollabGlyph } from "./collab-glyph";
import { EmailGlyph } from "./email-glyph";
import { EventBusGlyph } from "./event-bus-glyph";
import { IntegrationVaultGlyph } from "./integration-vault-glyph";
import { NotificationsGlyph } from "./notifications-glyph";
import { OnboardingGlyph } from "./onboarding-glyph";
import { QueueGlyph } from "./queue-glyph";
import { SagaGlyph } from "./saga-glyph";
import { SearchGlyph } from "./search-glyph";
import { SmsGlyph } from "./sms-glyph";
import { StorageGlyph } from "./storage-glyph";
import { TtsGlyph } from "./tts-glyph";
import type { SubpackageGlyph } from "./types";
import { UploadsGlyph } from "./uploads-glyph";
import { VideoComposeGlyph } from "./video-compose-glyph";
import { WebhooksGlyph } from "./webhooks-glyph";

export type { SubpackageGlyph, SubpackageGlyphProps } from "./types";

export const SUBPACKAGE_GLYPHS: Record<string, SubpackageGlyph> = {
  "admin-tooling": AdminToolingGlyph,
  cache: CacheGlyph,
  collab: CollabGlyph,
  email: EmailGlyph,
  "event-bus": EventBusGlyph,
  "integration-vault": IntegrationVaultGlyph,
  notifications: NotificationsGlyph,
  onboarding: OnboardingGlyph,
  queue: QueueGlyph,
  saga: SagaGlyph,
  search: SearchGlyph,
  sms: SmsGlyph,
  storage: StorageGlyph,
  tts: TtsGlyph,
  uploads: UploadsGlyph,
  "video-compose": VideoComposeGlyph,
  webhooks: WebhooksGlyph,
};

export function getSubpackageGlyph(slug: string): SubpackageGlyph | null {
  return SUBPACKAGE_GLYPHS[slug] ?? null;
}
