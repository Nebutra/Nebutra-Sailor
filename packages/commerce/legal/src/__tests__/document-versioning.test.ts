import { describe, expect, it } from "vitest";
import {
  getDocumentVersionHistory,
  type LegalDocumentMetadata,
  resolveDocumentVersion,
} from "../documents";

const versions: LegalDocumentMetadata[] = [
  {
    slug: "terms-of-service",
    type: "TERMS_OF_SERVICE",
    locale: "en",
    version: "1.0.0",
    title: "Terms",
    effectiveAt: new Date("2025-01-01"),
    isRequired: true,
    changelog: [],
  },
  {
    slug: "terms-of-service",
    type: "TERMS_OF_SERVICE",
    locale: "en",
    version: "1.1.0",
    title: "Terms",
    effectiveAt: new Date("2026-01-01"),
    isRequired: true,
    changelog: [],
  },
];

describe("document versioning", () => {
  it("resolves the latest effective version at a point in time", () => {
    const resolved = resolveDocumentVersion("terms-of-service", {
      documents: { "terms-of-service": versions },
      at: new Date("2025-12-31T23:59:59.000Z"),
    });

    expect(resolved?.version).toBe("1.0.0");
  });

  it("returns version history sorted newest first", () => {
    const history = getDocumentVersionHistory("terms-of-service", {
      documents: { "terms-of-service": versions },
    });

    expect(history.map((entry) => entry.version)).toEqual(["1.1.0", "1.0.0"]);
  });
});
