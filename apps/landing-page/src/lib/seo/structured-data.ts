/**
 * JSON-LD structured-data builders matching schema.org shapes.
 *
 * Each builder takes a typed input and returns a plain JSON-serializable
 * object. Render via the StructuredData component (see
 * `components/seo/structured-data.tsx`) to inject into a page.
 */

const SCHEMA_CONTEXT = "https://schema.org" as const;

type SchemaContext = typeof SCHEMA_CONTEXT;

export interface OrganizationSchemaInput {
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly description?: string;
  readonly sameAs?: ReadonlyArray<string>;
  readonly id?: string;
}

export interface OrganizationSchema {
  readonly "@context": SchemaContext;
  readonly "@type": "Organization";
  readonly "@id"?: string;
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly description?: string;
  readonly sameAs?: ReadonlyArray<string>;
}

export function buildOrganizationSchema(input: OrganizationSchemaInput): OrganizationSchema {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    ...(input.id ? { "@id": input.id } : {}),
    name: input.name,
    url: input.url,
    logo: input.logo,
    ...(input.description ? { description: input.description } : {}),
    ...(input.sameAs ? { sameAs: input.sameAs } : {}),
  };
}

export interface WebSiteSchemaInput {
  readonly name: string;
  readonly url: string;
  readonly description?: string;
  readonly inLanguage?: ReadonlyArray<string>;
  readonly searchUrlTemplate?: string;
  readonly publisherId?: string;
}

export interface WebSiteSchema {
  readonly "@context": SchemaContext;
  readonly "@type": "WebSite";
  readonly name: string;
  readonly url: string;
  readonly description?: string;
  readonly inLanguage?: ReadonlyArray<string>;
  readonly publisher?: { readonly "@id": string };
  readonly potentialAction?: {
    readonly "@type": "SearchAction";
    readonly target: { readonly "@type": "EntryPoint"; readonly urlTemplate: string };
    readonly "query-input": string;
  };
}

export function buildWebSiteSchema(input: WebSiteSchemaInput): WebSiteSchema {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.inLanguage ? { inLanguage: input.inLanguage } : {}),
    ...(input.publisherId ? { publisher: { "@id": input.publisherId } } : {}),
    ...(input.searchUrlTemplate
      ? {
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: input.searchUrlTemplate },
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  readonly url: string;
}

export interface BreadcrumbListSchema {
  readonly "@context": SchemaContext;
  readonly "@type": "BreadcrumbList";
  readonly itemListElement: ReadonlyArray<{
    readonly "@type": "ListItem";
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }>;
}

export function buildBreadcrumbListSchema(
  items: ReadonlyArray<BreadcrumbItem>,
): BreadcrumbListSchema {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export interface FaqPageSchema {
  readonly "@context": SchemaContext;
  readonly "@type": "FAQPage";
  readonly mainEntity: ReadonlyArray<{
    readonly "@type": "Question";
    readonly name: string;
    readonly acceptedAnswer: { readonly "@type": "Answer"; readonly text: string };
  }>;
}

export function buildFaqPageSchema(entries: ReadonlyArray<FaqEntry>): FaqPageSchema {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export interface ArticleSchemaInput {
  readonly headline: string;
  readonly description?: string;
  readonly url: string;
  readonly image?: string;
  readonly author?: { readonly name: string; readonly url?: string };
  readonly publisher?: { readonly name: string; readonly logo?: string };
  readonly datePublished: string;
  readonly dateModified?: string;
}

export interface ArticleSchema {
  readonly "@context": SchemaContext;
  readonly "@type": "Article";
  readonly headline: string;
  readonly description?: string;
  readonly mainEntityOfPage: { readonly "@type": "WebPage"; readonly "@id": string };
  readonly image?: string;
  readonly author?: {
    readonly "@type": "Person" | "Organization";
    readonly name: string;
    readonly url?: string;
  };
  readonly publisher?: {
    readonly "@type": "Organization";
    readonly name: string;
    readonly logo?: { readonly "@type": "ImageObject"; readonly url: string };
  };
  readonly datePublished: string;
  readonly dateModified?: string;
}

export function buildArticleSchema(input: ArticleSchemaInput): ArticleSchema {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Article",
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    ...(input.image ? { image: input.image } : {}),
    ...(input.author
      ? {
          author: {
            "@type": "Person",
            name: input.author.name,
            ...(input.author.url ? { url: input.author.url } : {}),
          },
        }
      : {}),
    ...(input.publisher
      ? {
          publisher: {
            "@type": "Organization",
            name: input.publisher.name,
            ...(input.publisher.logo
              ? { logo: { "@type": "ImageObject", url: input.publisher.logo } }
              : {}),
          },
        }
      : {}),
    datePublished: input.datePublished,
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export interface ProductSchemaInput {
  readonly name: string;
  readonly description?: string;
  readonly url: string;
  readonly image?: string;
  readonly brand?: string;
  readonly offers?: {
    readonly price: string;
    readonly priceCurrency: string;
    readonly availability?: string;
    readonly url?: string;
  };
  readonly aggregateRating?: {
    readonly ratingValue: number;
    readonly reviewCount: number;
  };
}

export interface ProductSchema {
  readonly "@context": SchemaContext;
  readonly "@type": "Product";
  readonly name: string;
  readonly description?: string;
  readonly url: string;
  readonly image?: string;
  readonly brand?: { readonly "@type": "Brand"; readonly name: string };
  readonly offers?: {
    readonly "@type": "Offer";
    readonly price: string;
    readonly priceCurrency: string;
    readonly availability?: string;
    readonly url?: string;
  };
  readonly aggregateRating?: {
    readonly "@type": "AggregateRating";
    readonly ratingValue: number;
    readonly reviewCount: number;
  };
}

export function buildProductSchema(input: ProductSchemaInput): ProductSchema {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
    ...(input.offers
      ? {
          offers: {
            "@type": "Offer",
            price: input.offers.price,
            priceCurrency: input.offers.priceCurrency,
            ...(input.offers.availability ? { availability: input.offers.availability } : {}),
            ...(input.offers.url ? { url: input.offers.url } : {}),
          },
        }
      : {}),
    ...(input.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.aggregateRating.ratingValue,
            reviewCount: input.aggregateRating.reviewCount,
          },
        }
      : {}),
  };
}

export type AnyStructuredData =
  | OrganizationSchema
  | WebSiteSchema
  | BreadcrumbListSchema
  | FaqPageSchema
  | ArticleSchema
  | ProductSchema;
