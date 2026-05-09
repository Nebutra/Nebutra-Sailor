import { describe, expect, it } from "vitest";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildOrganizationSchema,
  buildProductSchema,
  buildWebSiteSchema,
} from "../structured-data";

describe("buildOrganizationSchema", () => {
  it("returns valid Organization schema with required fields", () => {
    const schema = buildOrganizationSchema({
      name: "Nebutra",
      url: "https://nebutra.com",
      logo: "https://nebutra.com/icon.png",
    });

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe("Nebutra");
    expect(schema.url).toBe("https://nebutra.com");
    expect(schema.logo).toBe("https://nebutra.com/icon.png");
  });

  it("includes optional sameAs links when provided", () => {
    const schema = buildOrganizationSchema({
      name: "Nebutra",
      url: "https://nebutra.com",
      logo: "https://nebutra.com/icon.png",
      sameAs: ["https://x.com/nebutra"],
    });

    expect(schema.sameAs).toEqual(["https://x.com/nebutra"]);
  });
});

describe("buildWebSiteSchema", () => {
  it("returns valid WebSite schema with potentialAction when search URL provided", () => {
    const schema = buildWebSiteSchema({
      name: "Nebutra",
      url: "https://nebutra.com",
      searchUrlTemplate: "https://nebutra.com/search?q={search_term_string}",
    });

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.url).toBe("https://nebutra.com");
    expect(schema.potentialAction).toBeDefined();
    expect(schema.potentialAction?.["@type"]).toBe("SearchAction");
  });

  it("omits potentialAction when no search template", () => {
    const schema = buildWebSiteSchema({ name: "Nebutra", url: "https://nebutra.com" });
    expect(schema.potentialAction).toBeUndefined();
  });
});

describe("buildBreadcrumbListSchema", () => {
  it("builds a numbered itemListElement", () => {
    const schema = buildBreadcrumbListSchema([
      { name: "Home", url: "https://nebutra.com" },
      { name: "Pricing", url: "https://nebutra.com/pricing" },
    ]);

    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://nebutra.com",
    });
    expect(schema.itemListElement[1].position).toBe(2);
  });
});

describe("buildFaqPageSchema", () => {
  it("creates Question entries for each FAQ", () => {
    const schema = buildFaqPageSchema([
      { question: "Is it free?", answer: "Yes" },
      { question: "Is it open source?", answer: "Yes, MIT" },
    ]);

    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: { "@type": "Answer", text: "Yes" },
    });
  });
});

describe("buildArticleSchema", () => {
  it("builds Article with author, dates and image", () => {
    const schema = buildArticleSchema({
      headline: "Hello world",
      description: "Intro post",
      url: "https://nebutra.com/blog/hello",
      image: "https://nebutra.com/og.png",
      author: { name: "Nebutra" },
      datePublished: "2026-01-01",
      dateModified: "2026-01-02",
    });

    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe("Hello world");
    expect(schema.author?.name).toBe("Nebutra");
    expect(schema.datePublished).toBe("2026-01-01");
    expect(schema.dateModified).toBe("2026-01-02");
    expect(schema.image).toBe("https://nebutra.com/og.png");
  });
});

describe("buildProductSchema", () => {
  it("builds Product with price offer", () => {
    const schema = buildProductSchema({
      name: "Sailor Pro",
      description: "Pro plan",
      url: "https://nebutra.com/pricing",
      offers: { price: "99", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    });

    expect(schema["@type"]).toBe("Product");
    expect(schema.name).toBe("Sailor Pro");
    expect(schema.offers?.["@type"]).toBe("Offer");
    expect(schema.offers?.price).toBe("99");
    expect(schema.offers?.priceCurrency).toBe("USD");
  });
});
