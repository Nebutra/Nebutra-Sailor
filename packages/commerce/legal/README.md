# @nebutra/legal

> **Status: WIP** — Not yet integrated into any production app. Do not import until this notice is removed.

GDPR/CCPA-compliant consent management, legal document versioning, and React UI components for Nebutra.

## Design Intent

Legal compliance infrastructure belongs in a dedicated package so that every Nebutra app shares the same consent logic, document versioning, and cookie categorization rules. Duplicating this per-app risks compliance divergence. The package is divided into three layers: a pure-data **document configuration** layer (company info, document versions, cookie categories), a **consent service** layer (read/write cookie preferences, record document consent to a backend API, integrate with Google Tag Manager Consent Mode v2), and a **React components** layer (CookieBanner, ConsentCheckbox, LegalFooter).

Visitor identification uses a stable anonymous ID stored in localStorage, decoupled from any authenticated user ID.

## Usage

```typescript
import { CookieBanner, legalConfig, recordDocumentConsent } from "@nebutra/legal";

// In your layout
<CookieBanner />

// On terms acceptance
await recordDocumentConsent({ documentType: "terms", version: legalConfig.termsVersion });
```
