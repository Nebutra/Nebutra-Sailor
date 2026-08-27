/**
 * Analytics Types for Dub Integration
 */

// ============================================================================
// Configuration
// ============================================================================

export interface AnalyticsConfig {
  /** Dub API key */
  apiKey: string;
  /** Dub workspace ID */
  workspaceId?: string;
  /** Default domain for short links */
  defaultDomain?: string;
  /** Enable debug mode */
  debug?: boolean;
}

export interface MultiTenantConfig extends AnalyticsConfig {
  /** Function to resolve tenant ID from request */
  tenantResolver?: (req: Request) => Promise<string> | string;
  /** Domain configuration */
  domains?: {
    default: string;
    custom?: (tenantId: string) => Promise<string> | string;
  };
  /** Usage limits per plan */
  limits?: Record<string, PlanLimits>;
}

export interface PlanLimits {
  linksPerMonth: number;
  clicksPerMonth: number;
  customDomains?: number;
  teamMembers?: number;
}

// ============================================================================
// Links
// ============================================================================

export interface CreateLinkInput {
  /** Destination URL */
  url: string;
  /** Custom domain */
  domain?: string;
  /** Custom short key (slug) */
  key?: string;
  /** Tenant ID for multi-tenant */
  tenantId?: string;
  /** External ID for your reference */
  externalId?: string;
  /** Tags for organization */
  tags?: string[];
  /** UTM parameters */
  utm?: UTMParams;
  /** Link expiration date */
  expiresAt?: Date | string;
  /** Password protection */
  password?: string;
  /** iOS deep link */
  ios?: string;
  /** Android deep link */
  android?: string;
  /** Enable geo-targeting */
  geo?: GeoTargeting;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface Link {
  id: string;
  domain: string;
  key: string;
  url: string;
  shortLink: string;
  clicks: number;
  createdAt: string;
  updatedAt: string;
  tenantId?: string;
  externalId?: string;
  tags?: string[];
  utm?: UTMParams;
  expiresAt?: string;
  geo?: GeoTargeting;
  metadata?: Record<string, unknown>;
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface GeoTargeting {
  [countryCode: string]: string;
}

// ============================================================================
// Analytics
// ============================================================================

export interface AnalyticsQuery {
  /** Link ID or array of IDs */
  linkId?: string | string[];
  /** Domain filter */
  domain?: string;
  /** Tenant ID */
  tenantId?: string;
  /** Time interval (note: dub SDK v0.40+ removed 1h interval) */
  interval?: "24h" | "7d" | "30d" | "90d" | "1y" | "all";
  /** Start date */
  start?: Date | string;
  /** End date */
  end?: Date | string;
  /** Group by dimensions */
  groupBy?: AnalyticsDimension[];
  /** Filter by country */
  country?: string;
  /** Filter by device */
  device?: "desktop" | "mobile" | "tablet";
  /** Filter by browser */
  browser?: string;
  /** Filter by OS */
  os?: string;
  /** Filter by referer */
  referer?: string;
}

export type AnalyticsDimension =
  | "country"
  | "city"
  | "device"
  | "browser"
  | "os"
  | "referer"
  | "url"
  | "trigger";

export interface AnalyticsResult {
  clicks: number;
  leads?: number;
  sales?: number;
  saleAmount?: number;
  timeseries?: TimeseriesData[];
  countries?: CountryData[];
  cities?: CityData[];
  devices?: DeviceData[];
  browsers?: BrowserData[];
  os?: OSData[];
  referers?: RefererData[];
  urls?: URLData[];
}

export interface TimeseriesData {
  start: string;
  clicks: number;
  leads?: number;
  sales?: number;
}

export interface CountryData {
  country: string;
  clicks: number;
}

export interface CityData {
  city: string;
  country: string;
  clicks: number;
}

export interface DeviceData {
  device: string;
  clicks: number;
}

export interface BrowserData {
  browser: string;
  clicks: number;
}

export interface OSData {
  os: string;
  clicks: number;
}

export interface RefererData {
  referer: string;
  clicks: number;
}

export interface URLData {
  url: string;
  clicks: number;
}

// ============================================================================
// Conversions
// ============================================================================

export interface TrackConversionInput {
  /** Event name (e.g., "purchase", "signup") */
  eventName: string;
  /** Conversion value */
  value?: number;
  /** Currency code */
  currency?: string;
  /** Customer/user ID */
  customerId?: string;
  /** Click ID for attribution */
  clickId?: string;
  /** External ID */
  externalId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface Conversion {
  id: string;
  eventName: string;
  value?: number;
  currency?: string;
  customerId?: string;
  clickId?: string;
  linkId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AttributeConversionInput {
  /** Click ID from Dub */
  clickId: string;
  /** Event name */
  eventName: string;
  /** Conversion value */
  value?: number;
  /** Currency code */
  currency?: string;
  /** Customer ID */
  customerId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Referrals
// ============================================================================

export interface CreateReferralLinkInput {
  /** Referrer user ID */
  userId: string;
  /** Tenant ID */
  tenantId?: string;
  /** Reward type */
  rewardType?: "credit" | "discount" | "cash" | "points";
  /** Reward value */
  rewardValue?: number;
  /** Custom destination URL */
  destinationUrl?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface ReferralLink extends Link {
  userId: string;
  rewardType?: string;
  rewardValue?: number;
}

export interface ReferralStats {
  userId: string;
  clicks: number;
  signups: number;
  conversions: number;
  earned: number;
  pending: number;
  paid: number;
}

export interface ProcessRewardInput {
  /** Referrer user ID */
  referrerId: string;
  /** Referred user ID */
  referredId: string;
  /** Event type that triggered reward */
  eventType: "signup" | "purchase" | "subscription" | "custom";
  /** Reward amount (override default) */
  amount?: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Webhooks
// ============================================================================

export type WebhookEventType =
  | "link.created"
  | "link.updated"
  | "link.deleted"
  | "link.clicked"
  | "conversion.completed"
  | "referral.signup"
  | "referral.conversion";

export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: T;
}

export interface WebhookConfig {
  /** Webhook secret for verification */
  secret: string;
  /** Allowed event types */
  events?: WebhookEventType[];
}

// ============================================================================
// Client Events (Browser)
// ============================================================================

export interface TrackEventInput {
  /** Event name */
  name: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** Tenant ID */
  tenantId?: string;
  /** User ID */
  userId?: string;
}

export interface PageViewInput {
  /** Page URL */
  url?: string;
  /** Page title */
  title?: string;
  /** Referrer */
  referrer?: string;
  /** Tenant ID */
  tenantId?: string;
  /** User ID */
  userId?: string;
}

// ============================================================================
// Privacy & Compliance
// ============================================================================

export interface PrivacyOptions {
  /** Require cookie consent */
  cookieConsent?: boolean;
  /** Show cookie banner */
  cookieBanner?: boolean;
  /** Anonymize IP addresses */
  anonymizeIp?: boolean;
  /** Respect Do Not Track header */
  respectDoNotTrack?: boolean;
  /** Cookie domain */
  cookieDomain?: string;
  /** Cookie expiry in days */
  cookieExpiry?: number;
}

export interface GDPRRequest {
  /** User ID */
  userId: string;
  /** Tenant ID */
  tenantId?: string;
  /** Request type */
  type: "export" | "delete" | "anonymize";
}
