/**
 * Legal Document Configuration
 *
 * Central configuration for all legal documents, company info, and compliance settings.
 * This follows Silicon Valley unicorn patterns for legal infrastructure.
 */

import type {
  CompanyInfo,
  ContactConfig,
  CookieCategory,
  CookieConfig,
  DocumentConfig,
  LegalConfig,
} from "../types";

// ============================================
// Company Information
// ============================================

export const companyInfo: CompanyInfo = {
  legalName: "Nebutra, Inc.",
  tradeName: "Nebutra",
  jurisdiction: "Delaware, United States",
  registrationNumber: "", // To be filled
  vatNumber: "", // To be filled if applicable
  address: {
    street: "", // To be filled
    city: "San Francisco",
    state: "California",
    postalCode: "94105",
    country: "United States",
  },
  legalEmail: "legal@nebutra.com",
  privacyEmail: "privacy@nebutra.com",
  dpoEmail: "dpo@nebutra.com",
};

// ============================================
// Cookie Categories (GDPR/CCPA Compliant)
// ============================================

export const cookieCategories: CookieCategory[] = [
  {
    id: "necessary",
    name: "Strictly Necessary",
    description:
      "Essential cookies required for the website to function. These cannot be disabled.",
    required: true,
    defaultEnabled: true,
    cookies: [
      {
        name: "__session",
        provider: "Nebutra",
        purpose: "User authentication session",
        expiry: "Session",
        type: "session",
      },
      {
        name: "__clerk_db_jwt",
        provider: "Clerk",
        purpose: "Authentication token",
        expiry: "7 days",
        type: "persistent",
      },
      {
        name: "cookie_consent",
        provider: "Nebutra",
        purpose: "Stores cookie consent preferences",
        expiry: "1 year",
        type: "persistent",
      },
      {
        name: "__cf_bm",
        provider: "Cloudflare",
        purpose: "Bot detection and security",
        expiry: "30 minutes",
        type: "persistent",
      },
    ],
  },
  {
    id: "functional",
    name: "Functional",
    description:
      "Cookies that enable personalized features like language preferences and saved settings.",
    required: false,
    defaultEnabled: false,
    cookies: [
      {
        name: "locale",
        provider: "Nebutra",
        purpose: "Stores language preference",
        expiry: "1 year",
        type: "persistent",
      },
      {
        name: "theme",
        provider: "Nebutra",
        purpose: "Stores theme preference (light/dark)",
        expiry: "1 year",
        type: "persistent",
      },
      {
        name: "sidebar_collapsed",
        provider: "Nebutra",
        purpose: "UI preference",
        expiry: "1 year",
        type: "persistent",
      },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Cookies that help us understand how visitors interact with our website.",
    required: false,
    defaultEnabled: false,
    cookies: [
      {
        name: "_ga",
        provider: "Google Analytics",
        purpose: "Distinguishes unique users",
        expiry: "2 years",
        type: "persistent",
      },
      {
        name: "_ga_*",
        provider: "Google Analytics",
        purpose: "Maintains session state",
        expiry: "2 years",
        type: "persistent",
      },
      {
        name: "ph_*",
        provider: "PostHog",
        purpose: "Product analytics",
        expiry: "1 year",
        type: "persistent",
      },
      {
        name: "_vercel_insights",
        provider: "Vercel",
        purpose: "Web analytics",
        expiry: "Session",
        type: "session",
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description:
      "Cookies used to deliver relevant advertisements and track ad campaign performance.",
    required: false,
    defaultEnabled: false,
    cookies: [
      {
        name: "_fbp",
        provider: "Facebook",
        purpose: "Tracks visits for Facebook ads",
        expiry: "3 months",
        type: "persistent",
      },
      {
        name: "_gcl_au",
        provider: "Google Ads",
        purpose: "Conversion tracking",
        expiry: "3 months",
        type: "persistent",
      },
      {
        name: "hubspotutk",
        provider: "HubSpot",
        purpose: "Marketing automation",
        expiry: "6 months",
        type: "persistent",
      },
    ],
  },
  {
    id: "thirdParty",
    name: "Third-Party",
    description: "Cookies from third-party services embedded in our website (videos, maps, etc.).",
    required: false,
    defaultEnabled: false,
    cookies: [
      {
        name: "YSC",
        provider: "YouTube",
        purpose: "Embedded video tracking",
        expiry: "Session",
        type: "session",
      },
      {
        name: "VISITOR_INFO1_LIVE",
        provider: "YouTube",
        purpose: "Embedded video bandwidth estimation",
        expiry: "6 months",
        type: "persistent",
      },
    ],
  },
];

// ============================================
// Document Configurations
// ============================================

const baseDocumentDate = new Date("2025-01-01");

export const documentConfigs: Record<string, DocumentConfig> = {
  "privacy-policy": {
    metadata: {
      slug: "privacy-policy",
      type: "PRIVACY_POLICY",
      locale: "en",
      version: "1.0.0",
      title: "Privacy Policy",
      summary: "How we collect, use, and protect your personal information",
      effectiveAt: baseDocumentDate,
      isRequired: true,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial privacy policy",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/privacy-policy.mdx",
    relatedDocs: ["cookie-policy", "data-processing"],
  },
  "terms-of-service": {
    metadata: {
      slug: "terms-of-service",
      type: "TERMS_OF_SERVICE",
      locale: "en",
      version: "1.0.0",
      title: "Terms of Service",
      summary: "The agreement governing your use of Nebutra services",
      effectiveAt: baseDocumentDate,
      isRequired: true,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial terms of service",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/terms-of-service.mdx",
    relatedDocs: ["privacy-policy", "acceptable-use"],
  },
  "cookie-policy": {
    metadata: {
      slug: "cookie-policy",
      type: "COOKIE_POLICY",
      locale: "en",
      version: "1.0.0",
      title: "Cookie Policy",
      summary: "How we use cookies and similar technologies",
      effectiveAt: baseDocumentDate,
      isRequired: false,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial cookie policy",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/cookie-policy.mdx",
    relatedDocs: ["privacy-policy"],
  },
  "refund-policy": {
    metadata: {
      slug: "refund-policy",
      type: "REFUND_POLICY",
      locale: "en",
      version: "1.0.0",
      title: "Refund Policy",
      summary: "Our refund and cancellation policies",
      effectiveAt: baseDocumentDate,
      isRequired: false,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial refund policy",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/refund-policy.mdx",
    relatedDocs: ["terms-of-service"],
  },
  "acceptable-use": {
    metadata: {
      slug: "acceptable-use",
      type: "ACCEPTABLE_USE",
      locale: "en",
      version: "1.0.0",
      title: "Acceptable Use Policy",
      summary: "Guidelines for acceptable use of our services",
      effectiveAt: baseDocumentDate,
      isRequired: false,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial acceptable use policy",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/acceptable-use.mdx",
    relatedDocs: ["terms-of-service"],
  },
  "data-processing": {
    metadata: {
      slug: "data-processing",
      type: "DATA_PROCESSING",
      locale: "en",
      version: "1.0.0",
      title: "Data Processing Agreement",
      summary: "Agreement for processing personal data on your behalf",
      effectiveAt: baseDocumentDate,
      isRequired: false,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial DPA",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/data-processing.mdx",
    relatedDocs: ["privacy-policy"],
  },
  sla: {
    metadata: {
      slug: "sla",
      type: "SLA",
      locale: "en",
      version: "1.0.0",
      title: "Service Level Agreement",
      summary: "Our commitment to service availability and support",
      effectiveAt: baseDocumentDate,
      isRequired: false,
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          summary: "Initial SLA",
          changes: ["Initial release"],
        },
      ],
    },
    contentPath: "content/en/sla.mdx",
    relatedDocs: ["terms-of-service"],
  },
};

// ============================================
// Cookie Configuration
// ============================================

export const cookieConfig: CookieConfig = {
  categories: cookieCategories,
  consentDuration: 365, // 1 year
  showOnFirstVisit: true,
  bannerPosition: "bottom",
};

// ============================================
// Contact Configuration
// ============================================

export const contactConfig: ContactConfig = {
  generalEmail: "contact@nebutra.com",
  salesEmail: "sales@nebutra.com",
  supportEmail: "support@nebutra.com",
  legalEmail: "legal@nebutra.com",
  privacyEmail: "privacy@nebutra.com",
  social: {
    twitter: "https://twitter.com/nebutra",
    linkedin: "https://linkedin.com/company/nebutra",
    github: "https://github.com/nebutra",
  },
};

// ============================================
// Full Configuration Export
// ============================================

export const legalConfig: LegalConfig = {
  company: companyInfo,
  documents: documentConfigs,
  cookies: cookieConfig,
  contact: contactConfig,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get document configuration by slug
 */
export function getDocumentConfig(slug: string): DocumentConfig | undefined {
  return documentConfigs[slug];
}

/**
 * Get all required documents
 */
export function getRequiredDocuments(): DocumentConfig[] {
  return Object.values(documentConfigs).filter((doc) => doc.metadata.isRequired);
}

/**
 * Get documents by type
 */
export function getDocumentsByType(type: DocumentConfig["metadata"]["type"]): DocumentConfig[] {
  return Object.values(documentConfigs).filter((doc) => doc.metadata.type === type);
}

/**
 * Get cookie category by ID
 */
export function getCookieCategory(id: string): CookieCategory | undefined {
  return cookieCategories.find((cat) => cat.id === id);
}

/**
 * Get all non-required cookie categories
 */
export function getOptionalCookieCategories(): CookieCategory[] {
  return cookieCategories.filter((cat) => !cat.required);
}
