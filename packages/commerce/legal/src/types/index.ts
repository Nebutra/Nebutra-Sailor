/**
 * Legal & Compliance Types
 *
 * Type definitions for legal documents, consent tracking, and cookie management.
 * Follows GDPR, CCPA, and SOC2 compliance requirements.
 */

// ============================================
// Document Types
// ============================================

export type LegalDocumentType =
  | "PRIVACY_POLICY"
  | "TERMS_OF_SERVICE"
  | "COOKIE_POLICY"
  | "REFUND_POLICY"
  | "ACCEPTABLE_USE"
  | "DATA_PROCESSING"
  | "SLA"
  | "CUSTOM";

export type ConsentType = "EXPLICIT" | "IMPLICIT" | "OPT_IN" | "OPT_OUT";

export interface LegalDocumentMetadata {
  /** Unique slug identifier (e.g., "privacy-policy") */
  slug: string;
  /** Document type */
  type: LegalDocumentType;
  /** ISO locale code (e.g., "en", "zh") */
  locale: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Document title */
  title: string;
  /** Brief summary for UI display */
  summary?: string;
  /** When this version becomes effective */
  effectiveAt: Date;
  /** When this version expires (optional) */
  expiresAt?: Date;
  /** Whether user must consent to this document */
  isRequired: boolean;
  /** Changelog entries */
  changelog: ChangelogEntry[];
}

export interface ChangelogEntry {
  /** Version this entry applies to */
  version: string;
  /** Date of change */
  date: string;
  /** Summary of changes */
  summary: string;
  /** Detailed list of changes */
  changes: string[];
}

export interface LegalDocument extends LegalDocumentMetadata {
  /** Database ID */
  id: string;
  /** SHA-256 hash of content for integrity */
  contentHash?: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Is this the active version? */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Consent Types
// ============================================

export interface UserConsentRecord {
  id: string;
  /** Clerk user ID (optional for anonymous) */
  userId?: string;
  /** Clerk organization ID */
  organizationId?: string;
  /** Anonymous visitor fingerprint */
  visitorId?: string;
  /** Document ID */
  documentId: string;
  /** Document slug for quick lookup */
  documentSlug: string;
  /** Document version consented to */
  documentVersion: string;
  /** How consent was given */
  consentType: ConsentType;
  /** Whether consent was given (false = withdrawn) */
  consentGiven: boolean;
  /** IP address at time of consent */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Context where consent was given (signup, checkout, etc.) */
  consentContext?: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** When consent was given */
  consentedAt: Date;
  /** When consent was withdrawn (if applicable) */
  withdrawnAt?: Date;
}

export interface ConsentRequest {
  /** Document slug */
  documentSlug: string;
  /** Specific version (optional, defaults to latest) */
  documentVersion?: string;
  /** How consent is being given */
  consentType?: ConsentType;
  /** Context (signup, checkout, settings) */
  context?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ConsentStatus {
  /** Has user consented to this document? */
  hasConsented: boolean;
  /** Version user consented to */
  consentedVersion?: string;
  /** Current active version */
  currentVersion: string;
  /** Does user need to re-consent (new version)? */
  needsReconsent: boolean;
  /** When user last consented */
  lastConsentedAt?: Date;
}

// ============================================
// Cookie Consent Types
// ============================================

export interface CookieCategory {
  /** Category ID */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this category includes */
  description: string;
  /** Can this category be disabled? */
  required: boolean;
  /** Default state */
  defaultEnabled: boolean;
  /** List of cookies in this category */
  cookies: CookieDefinition[];
}

export interface CookieDefinition {
  /** Cookie name */
  name: string;
  /** Provider/Service */
  provider: string;
  /** Purpose description */
  purpose: string;
  /** Expiry duration */
  expiry: string;
  /** Cookie type */
  type: "persistent" | "session";
}

export interface CookiePreferences {
  /** Strictly necessary (always true) */
  necessary: true;
  /** Functional cookies (preferences, language) */
  functional: boolean;
  /** Analytics cookies (tracking, metrics) */
  analytics: boolean;
  /** Marketing cookies (ads, retargeting) */
  marketing: boolean;
  /** Third-party embeds */
  thirdParty: boolean;
}

export interface CookieConsentRecord {
  id: string;
  /** Visitor fingerprint */
  visitorId: string;
  /** Clerk user ID (if logged in) */
  userId?: string;
  /** Cookie preferences */
  preferences: CookiePreferences;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** When consent was given */
  consentedAt: Date;
  /** When preferences were last updated */
  updatedAt: Date;
  /** When this consent expires */
  expiresAt: Date;
}

export interface CookieConsentRequest {
  /** Visitor fingerprint */
  visitorId: string;
  /** Cookie preferences */
  preferences: Omit<CookiePreferences, "necessary">;
}

// ============================================
// Contact Form Types
// ============================================

export type ContactCategory =
  | "general"
  | "sales"
  | "support"
  | "legal"
  | "privacy"
  | "partnership"
  | "press";

export type ContactStatus = "new" | "in_progress" | "resolved" | "spam";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
  category: ContactCategory;
  status: ContactStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  respondedAt?: Date;
}

export interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
  category?: ContactCategory;
}

// ============================================
// Document Configuration
// ============================================

export interface DocumentConfig {
  /** Document metadata */
  metadata: LegalDocumentMetadata;
  /** Path to MDX content file */
  contentPath: string;
  /** Related documents (e.g., DPA links to Privacy Policy) */
  relatedDocs?: string[];
}

export interface LegalConfig {
  /** Company information */
  company: CompanyInfo;
  /** Available documents */
  documents: Record<string, DocumentConfig>;
  /** Cookie configuration */
  cookies: CookieConfig;
  /** Contact configuration */
  contact: ContactConfig;
}

export interface CompanyInfo {
  /** Legal entity name */
  legalName: string;
  /** Trade name (if different) */
  tradeName?: string;
  /** Jurisdiction */
  jurisdiction: string;
  /** Registration number */
  registrationNumber?: string;
  /** VAT number */
  vatNumber?: string;
  /** Address */
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  /** Contact email for legal */
  legalEmail: string;
  /** Privacy contact email */
  privacyEmail: string;
  /** DPO contact (if applicable) */
  dpoEmail?: string;
}

export interface CookieConfig {
  /** Cookie categories */
  categories: CookieCategory[];
  /** Cookie consent duration in days */
  consentDuration: number;
  /** Show banner on first visit? */
  showOnFirstVisit: boolean;
  /** Position of banner */
  bannerPosition: "top" | "bottom";
}

export interface ContactConfig {
  /** Email for general inquiries */
  generalEmail: string;
  /** Sales email */
  salesEmail: string;
  /** Support email */
  supportEmail: string;
  /** Legal email */
  legalEmail: string;
  /** Privacy email */
  privacyEmail: string;
  /** Social media links */
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}
