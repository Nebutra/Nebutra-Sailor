import type { CustomEndpoint } from "./config.js";

export type AiMode = "gateway" | "direct" | "custom" | "none";

export interface AiRoutingConfig {
  profile: "multi-provider-gateway" | "direct-adapters" | "openai-compatible" | "disabled";
  providerSeed: string[];
  runtimeGovernance: boolean;
}

export interface AiTopologySelection {
  mode: AiMode;
  providerIds: string[];
  customEndpoint?: CustomEndpoint;
  routing: AiRoutingConfig;
}

const GATEWAY_PROVIDER_SEED = ["openai", "anthropic", "google"] as const;
const DIRECT_PROVIDER_SEED = ["openai"] as const;

interface ResolveAiTopologyInput {
  mode: AiMode;
  providerIds?: string[];
  customEndpoint?: CustomEndpoint;
}

export function resolveAiTopology(input: ResolveAiTopologyInput): AiTopologySelection {
  const providerIds = input.providerIds ?? [];

  switch (input.mode) {
    case "gateway": {
      const seed = providerIds.length > 0 ? providerIds : [...GATEWAY_PROVIDER_SEED];
      return {
        mode: "gateway",
        providerIds: seed,
        customEndpoint: input.customEndpoint,
        routing: {
          profile: "multi-provider-gateway",
          providerSeed: seed,
          runtimeGovernance: true,
        },
      };
    }
    case "direct": {
      const seed = providerIds.length > 0 ? providerIds : [...DIRECT_PROVIDER_SEED];
      return {
        mode: "direct",
        providerIds: seed,
        customEndpoint: input.customEndpoint,
        routing: {
          profile: "direct-adapters",
          providerSeed: seed,
          runtimeGovernance: false,
        },
      };
    }
    case "custom":
      return {
        mode: "custom",
        providerIds,
        customEndpoint: input.customEndpoint,
        routing: {
          profile: "openai-compatible",
          providerSeed: providerIds,
          runtimeGovernance: true,
        },
      };
    case "none":
      return {
        mode: "none",
        providerIds: [],
        routing: {
          profile: "disabled",
          providerSeed: [],
          runtimeGovernance: false,
        },
      };
  }
}
