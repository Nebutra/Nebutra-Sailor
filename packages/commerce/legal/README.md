# @nebutra/legal

> **Status: Foundation** — Core metadata, version resolution, and consent persistence seams exist, but production app/API integration is still pending.

GDPR/CCPA-compliant consent management, legal document versioning, and React UI components for Nebutra.

## Design Intent

Legal compliance infrastructure belongs in a dedicated package so that every Nebutra app shares the same consent logic, document versioning, and cookie categorization rules. Duplicating this per-app risks compliance divergence. The package is divided into three layers: a pure-data **document configuration** layer (company info, document versions, cookie categories), a **consent service** layer (read/write cookie preferences, record document consent to a backend API, integrate with Google Tag Manager Consent Mode v2), and a **React components** layer (CookieBanner, ConsentCheckbox, LegalFooter).

Visitor identification uses a stable anonymous ID stored in localStorage, decoupled from any authenticated user ID. Server-side consent persistence is exposed through an adapter-backed service so apps can wire it to their database/API boundary without mixing localStorage helpers with durable records.

## Usage

```typescript
import { CookieBanner, legalConfig, recordDocumentConsent } from "@nebutra/legal";

// In your layout
<CookieBanner />

// On terms acceptance
await recordDocumentConsent({ documentType: "terms", version: legalConfig.termsVersion });
```

## Persistence seam

```typescript
import { createConsentPersistenceService, createMemoryConsentStore } from "@nebutra/legal";

const consent = createConsentPersistenceService({
  store: createMemoryConsentStore(),
});

await consent.recordDocumentConsent({
  documentSlug: "terms-of-service",
  visitorId: "visitor_123",
});
```
