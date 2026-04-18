/**
 * Headless CMS provider registry for create-sailor. L2 depth:
 * env-var injection + package/app prune (Sanity Studio lives in apps/studio).
 */

export type CmsProviderId = "sanity" | "contentful" | "strapi" | "none";

export type CmsRegion = "global" | "cn" | "both";

export interface CmsProviderMeta {
  id: CmsProviderId;
  name: string;
  region: CmsRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const CMS_PROVIDERS: CmsProviderMeta[] = [
  {
    id: "sanity",
    name: "Sanity",
    region: "global",
    envVars: ["SANITY_PROJECT_ID", "SANITY_DATASET", "SANITY_API_TOKEN", "SANITY_API_VERSION"],
    docs: "https://www.sanity.io/docs",
    description: "Structured content platform with Studio",
  },
  {
    id: "contentful",
    name: "Contentful",
    region: "global",
    envVars: ["CONTENTFUL_SPACE_ID", "CONTENTFUL_ACCESS_TOKEN", "CONTENTFUL_PREVIEW_ACCESS_TOKEN"],
    docs: "https://www.contentful.com/developers/docs/",
    description: "Headless CMS",
  },
  {
    id: "strapi",
    name: "Strapi",
    region: "both",
    envVars: ["STRAPI_URL", "STRAPI_API_TOKEN"],
    docs: "https://docs.strapi.io",
    description: "Open-source self-hosted CMS",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
    description: "",
  },
];

export function getCmsProvider(id: string): CmsProviderMeta | undefined {
  return CMS_PROVIDERS.find((p) => p.id === id);
}

export const CMS_BY_REGION = CMS_PROVIDERS.reduce<Record<CmsRegion, CmsProviderMeta[]>>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<CmsRegion, CmsProviderMeta[]>,
);
