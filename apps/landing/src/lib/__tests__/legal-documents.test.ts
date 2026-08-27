import { describe, expect, it, vi } from "vitest";
import { getLegalDocument, type LegalDocument } from "../legal-documents";

const sampleDoc: LegalDocument = {
  id: "doc_1",
  slug: "privacy-policy",
  type: "PRIVACY_POLICY",
  locale: "en",
  version: "v1.0.0",
  title: "Privacy Policy",
  summary: "How we handle your data.",
  content: "# Privacy Policy\n\nWe respect your privacy.",
  effectiveAt: "2025-01-01T00:00:00.000Z",
  expiresAt: null,
  isActive: true,
  isRequired: true,
};

describe("getLegalDocument", () => {
  it("returns the document when the fetcher resolves with one", async () => {
    const fetcher = vi.fn().mockResolvedValue(sampleDoc);
    const result = await getLegalDocument("privacy-policy", "en", fetcher);
    expect(fetcher).toHaveBeenCalledWith("privacy-policy", "en");
    expect(result).toEqual(sampleDoc);
  });

  it("returns null when the fetcher resolves with null", async () => {
    const fetcher = vi.fn().mockResolvedValue(null);
    const result = await getLegalDocument("privacy-policy", "en", fetcher);
    expect(result).toBeNull();
  });

  it("returns null defensively when the fetcher throws", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await getLegalDocument("privacy-policy", "en", fetcher);
    expect(result).toBeNull();
  });

  it("returns null when payload fails schema validation", async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: "doc_x" /* missing fields */ });
    const result = await getLegalDocument("privacy-policy", "en", fetcher);
    expect(result).toBeNull();
  });

  it("falls back to English when locale-specific document is not found", async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (slug: string, locale: string) => {
        expect(slug).toBe("privacy-policy");
        expect(locale).toBe("zh");
        return null;
      })
      .mockImplementationOnce(async (slug: string, locale: string) => {
        expect(slug).toBe("privacy-policy");
        expect(locale).toBe("en");
        return sampleDoc;
      });

    const result = await getLegalDocument("privacy-policy", "zh", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result).toEqual(sampleDoc);
  });

  it("does not fall back twice if locale already is English", async () => {
    const fetcher = vi.fn().mockResolvedValue(null);
    const result = await getLegalDocument("privacy-policy", "en", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});
