import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { Project } from "./projects";
import { BASE_URL, inLanguageTags } from "./seo/alternates";

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Tseka Luk",
    givenName: "Tseka",
    familyName: "Luk",
    url: BASE_URL,
    jobTitle: "CEO & AI-Native Builder",
    worksFor: {
      "@type": "Organization",
      name: `${brand.name} Intelligence`,
      url: getBrandOrigin("landing"),
    },
    knowsAbout: [
      "Artificial Intelligence",
      "AI Agents",
      "Next.js",
      "TypeScript",
      "Product Design",
      "SaaS Architecture",
    ],
    sameAs: [
      "https://github.com/TsekaLuk",
      "https://x.com/tseka_luk",
      "https://linkedin.com/in/tsekaluk",
    ],
    image: `${BASE_URL}/images/black.jpeg`,
    description:
      "I design and build AI-powered products from zero to one. Shipping fast and iterating in public.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TsekaLuk.dev",
    url: BASE_URL,
    // Derived from the publication set, never a literal array. The old
    // ["en", "zh", "ja"] both under-declared the catalog-translated surface and
    // contained a bare `zh`, which is not a route locale (CLDR multi-script:
    // zh-Hans / zh-Hant) and which the router cannot resolve.
    inLanguage: inLanguageTags("ui"),
    author: personJsonLd(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/thinking?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function projectJsonLd(project: Project) {
  const hasTechStack = project.techStack && project.techStack.length > 0;
  return {
    "@context": "https://schema.org",
    "@type": hasTechStack ? "SoftwareApplication" : "CreativeWork",
    name: project.name,
    description: project.tagline,
    url: `${BASE_URL}/work/${project.slug}`,
    author: { "@type": "Person", name: "Tseka Luk", url: BASE_URL },
    ...(project.github ? { codeRepository: project.github } : {}),
    ...(project.url ? { installUrl: project.url } : {}),
    keywords: project.tags.join(", "),
    ...(hasTechStack ? { applicationCategory: "WebApplication" } : {}),
  };
}

export function articleJsonLd(article: {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    url: `${BASE_URL}/thinking/${article.slug}`,
    datePublished: article.date,
    dateModified: article.date,
    description: article.excerpt,
    author: { "@type": "Person", name: "Tseka Luk", url: BASE_URL },
    publisher: {
      "@type": "Person",
      name: "Tseka Luk",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/thinking/${article.slug}`,
    },
  };
}
