/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// "use cache" + cacheLife are gated on cacheComponents config (only loaded by
// next build/dev). In vitest, no-op the cache directives so the wrapped
// functions can be called directly.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/legal-documents", () => ({
  getLegalDocument: vi.fn(),
}));

import { notFound } from "next/navigation";
import { getLegalDocument, type LegalDocument } from "@/lib/legal-documents";
import { LegalDocumentContent } from "../_components/legal-document-content";
import { generateMetadata } from "../page";

const mockedGet = vi.mocked(getLegalDocument);
const mockedNotFound = vi.mocked(notFound);

const sample: LegalDocument = {
  id: "doc_1",
  slug: "privacy-policy",
  type: "PRIVACY_POLICY",
  locale: "en",
  version: "v1.0.0",
  title: "Privacy Policy",
  summary: "How Nebutra handles your data.",
  content: "# Privacy\n\nWe respect your privacy.",
  effectiveAt: "2025-01-01T00:00:00.000Z",
  expiresAt: null,
  isActive: true,
  isRequired: true,
};

describe("/legal/[slug] page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockedGet.mockReset();
  });

  it("renders the document title, summary, and body", async () => {
    mockedGet.mockResolvedValue(sample);

    // The page wraps content in <Suspense>; the async inner component is what
    // actually performs the fetch + render. Test it directly to bypass Suspense.
    const ui = await LegalDocumentContent({ slug: "privacy-policy", lang: "en" });
    render(ui as React.ReactElement);

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText("How Nebutra handles your data.")).toBeInTheDocument();
    expect(screen.getByText(/We respect your privacy/i)).toBeInTheDocument();
  });

  it("calls notFound when the document is missing", async () => {
    mockedGet.mockResolvedValue(null);

    await expect(LegalDocumentContent({ slug: "missing", lang: "en" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockedNotFound).toHaveBeenCalled();
  });

  it("returns SEO metadata derived from the document", async () => {
    mockedGet.mockResolvedValue(sample);
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: "en", slug: "privacy-policy" }),
    });
    expect(meta.title).toBe("Privacy Policy");
    expect(meta.description).toBe("How Nebutra handles your data.");
  });

  it("returns empty metadata when document missing (graceful)", async () => {
    mockedGet.mockResolvedValue(null);
    const meta = await generateMetadata({
      params: Promise.resolve({ lang: "en", slug: "nope" }),
    });
    expect(meta.title).toBeUndefined();
    expect(meta.description).toBeUndefined();
  });
});
