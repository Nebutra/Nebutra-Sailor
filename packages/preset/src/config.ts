import { z } from "zod";
import { getPreset } from "./presets";

// ─── Enum Schemas ───

export const PresetId = z.enum([
  "ai-saas",
  "marketing",
  "dashboard",
  "overseas",
  "growth",
  "creative",
  "blog-portfolio",
  "community",
  "one-person",
  "full",
]);

export const AppId = z.enum([
  "web",
  "landing-page",
  "blog",
  "admin",
  "api-gateway",
  "studio",
  "storybook",
  "docs-hub",
]);

export const FeatureId = z.enum([
  "billing",
  "ai",
  "ecommerce",
  "web3",
  "community",
  "blog",
  "growth",
  "search",
  "sso",
  "admin",
  "analytics",
  "newsletter",
  "realtime",
  "upload",
]);

export const ThemeId = z.enum([
  "neon",
  "gradient",
  "dark-dense",
  "minimal",
  "vibrant",
  "ocean",
  "custom",
]);

export const ApiProtocolId = z.enum(["rest", "orpc", "trpc"]);

export const AuthProviderId = z.enum(["clerk", "better-auth"]);

// ─── Config Schema ───

export const NebutraConfigSchema = z.object({
  preset: PresetId.default("full"),
  apps: z.record(z.string(), z.boolean()).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  theme: ThemeId.default("neon"),
  locales: z.array(z.string()).default(["en"]),
  defaultLocale: z.string().default("en"),
  apiProtocols: z.array(ApiProtocolId).default(["rest"]),
  authProvider: AuthProviderId.default("clerk"),
});

export type NebutraConfig = z.infer<typeof NebutraConfigSchema>;

// ─── Preset Definition Type ───

export interface PresetDefinition {
  id: z.infer<typeof PresetId>;
  name: string;
  description: string;
  apps: Record<z.infer<typeof AppId>, boolean>;
  features: Record<z.infer<typeof FeatureId>, boolean>;
  theme: z.infer<typeof ThemeId>;
}

// ─── Resolved Config ───

export interface ResolvedConfig {
  apps: Record<z.infer<typeof AppId>, boolean>;
  features: Record<z.infer<typeof FeatureId>, boolean>;
  theme: z.infer<typeof ThemeId>;
  locales: string[];
  defaultLocale: string;
  apiProtocols: z.infer<typeof ApiProtocolId>[];
  authProvider: z.infer<typeof AuthProviderId>;
}

// ─── Public API ───

export function defineConfig(config: Partial<NebutraConfig>): NebutraConfig {
  return NebutraConfigSchema.parse(config);
}

export function resolveConfig(config: NebutraConfig): ResolvedConfig {
  const preset = getPreset(config.preset);
  return {
    apps: { ...preset.apps, ...config.apps },
    features: { ...preset.features, ...config.features },
    theme: config.theme,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    apiProtocols: config.apiProtocols,
    authProvider: config.authProvider,
  };
}
