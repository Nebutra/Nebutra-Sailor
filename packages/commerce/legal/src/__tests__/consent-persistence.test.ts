import { describe, expect, it } from "vitest";
import {
  createConsentPersistenceService,
  createMemoryConsentStore,
  resolveConsentStatus,
} from "../consent";

describe("consent persistence", () => {
  it("persists document consent records with resolved document versions", async () => {
    const service = createConsentPersistenceService({
      store: createMemoryConsentStore(),
      now: () => new Date("2026-01-02T03:04:05.000Z"),
    });

    const record = await service.recordDocumentConsent({
      documentSlug: "terms-of-service",
      visitorId: "visitor_123",
      consentType: "EXPLICIT",
      context: "signup",
    });

    expect(record).toMatchObject({
      documentSlug: "terms-of-service",
      documentVersion: "1.0.0",
      visitorId: "visitor_123",
      consentType: "EXPLICIT",
      consentGiven: true,
      consentContext: "signup",
    });
    expect(record.consentedAt).toEqual(new Date("2026-01-02T03:04:05.000Z"));
  });

  it("reports re-consent when a newer active document version exists", async () => {
    const store = createMemoryConsentStore();
    const service = createConsentPersistenceService({
      store,
      documents: {
        "privacy-policy": [
          {
            slug: "privacy-policy",
            type: "PRIVACY_POLICY",
            locale: "en",
            version: "1.0.0",
            title: "Privacy Policy",
            effectiveAt: new Date("2025-01-01"),
            isRequired: true,
            changelog: [],
          },
          {
            slug: "privacy-policy",
            type: "PRIVACY_POLICY",
            locale: "en",
            version: "1.1.0",
            title: "Privacy Policy",
            effectiveAt: new Date("2026-01-01"),
            isRequired: true,
            changelog: [],
          },
        ],
      },
      now: () => new Date("2026-02-01"),
    });

    await service.recordDocumentConsent({
      documentSlug: "privacy-policy",
      documentVersion: "1.0.0",
      visitorId: "visitor_123",
    });

    const status = await resolveConsentStatus({
      documentSlug: "privacy-policy",
      visitorId: "visitor_123",
      store,
      documents: service.documents,
      now: new Date("2026-02-01"),
    });

    expect(status).toMatchObject({
      hasConsented: true,
      consentedVersion: "1.0.0",
      currentVersion: "1.1.0",
      needsReconsent: true,
    });
  });
});
