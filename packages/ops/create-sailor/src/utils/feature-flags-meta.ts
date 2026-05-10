/**
 * Feature flags provider registry for create-sailor. L2 depth:
 * env-var injection + `packages/feature-flags` prune.
 */

export type FeatureFlagsProviderId = "vercel-flags" | "growthbook" | "configcat" | "none";

export type FeatureFlagsRegion = "global" | "cn" | "both";

export interface FeatureFlagsProviderMeta {
  id: FeatureFlagsProviderId;
  name: string;
  region: FeatureFlagsRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const FEATURE_FLAGS_PROVIDERS: FeatureFlagsProviderMeta[] = [
  {
    id: "vercel-flags",
    name: "Vercel Flags SDK",
    region: "global",
    envVars: ["FLAGS_SECRET"],
    docs: "https://vercel.com/docs/workflow-collaboration/feature-flags",
    description: "Native Vercel feature flags",
  },
  {
    id: "growthbook",
    name: "GrowthBook",
    region: "both",
    envVars: ["GROWTHBOOK_API_HOST", "GROWTHBOOK_CLIENT_KEY", "GROWTHBOOK_DECRYPTION_KEY"],
    docs: "https://docs.growthbook.io",
    description: "Open-source A/B testing + flags",
  },
  {
    id: "configcat",
    name: "ConfigCat",
    region: "global",
    envVars: ["CONFIGCAT_SDK_KEY"],
    docs: "https://configcat.com/docs/",
    description: "Feature flag & config management",
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

export function getFeatureFlagsProvider(id: string): FeatureFlagsProviderMeta | undefined {
  return FEATURE_FLAGS_PROVIDERS.find((p) => p.id === id);
}

export const FEATURE_FLAGS_BY_REGION = FEATURE_FLAGS_PROVIDERS.reduce<
  Record<FeatureFlagsRegion, FeatureFlagsProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<FeatureFlagsRegion, FeatureFlagsProviderMeta[]>,
);
