import { LANGUAGE_IDS as BUILT_IN_THEME_IDS, isThemeId } from "@nebutra/theme/registry";
import { z } from "zod";
import {
  type DeployTargetMap,
  getDefaultDeployTargets,
  resolveDeployTargetConfig,
} from "./deploy-target";

// ─── Enum Schemas ───

export const AppId = z.enum([
  "web",
  "landing-page",
  "blog",
  "admin",
  "api-gateway",
  "studio",
  "storybook",
  "sailor-docs",
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

export { BUILT_IN_THEME_IDS };

/** Design language id (Brand Package swap) or "custom". Oklch moods removed. */
export const ThemeId = z.string().superRefine((value, ctx) => {
  if (isThemeId(value)) return;
  ctx.addIssue({
    code: "custom",
    message: `Unknown design language '${value}'. Use one of: ${[...BUILT_IN_THEME_IDS, "custom"].join(", ")}`,
  });
});

export const ApiProtocolId = z.enum(["rest", "orpc", "trpc"]);

export const AuthProviderId = z.enum(["clerk", "better-auth", "nextauth", "supabase"]);

const DeployTargetsSchema = z
  .record(z.string(), z.string())
  .default(getDefaultDeployTargets())
  .transform((value, ctx): DeployTargetMap => {
    try {
      return resolveDeployTargetConfig(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : String(error),
      });
      return z.NEVER;
    }
  });

// ─── Defaults (everything on — the former "full" baseline) ───

const DEFAULT_APPS: Record<z.infer<typeof AppId>, boolean> = {
  web: true,
  "landing-page": true,
  blog: true,
  admin: true,
  "api-gateway": true,
  studio: true,
  storybook: true,
  "sailor-docs": true,
};

const DEFAULT_FEATURES: Record<z.infer<typeof FeatureId>, boolean> = {
  billing: true,
  ai: true,
  ecommerce: true,
  web3: true,
  community: true,
  blog: true,
  growth: true,
  search: true,
  sso: true,
  admin: true,
  analytics: true,
  newsletter: true,
  realtime: true,
  upload: true,
};

// ─── Config Schema ───

export const NebutraConfigSchema = z.object({
  apps: z.record(z.string(), z.boolean()).default(DEFAULT_APPS),
  features: z.record(z.string(), z.boolean()).default(DEFAULT_FEATURES),
  theme: ThemeId.default("factory"),
  locales: z.array(z.string()).default(["en"]),
  defaultLocale: z.string().default("en"),
  apiProtocols: z.array(ApiProtocolId).default(["rest"]),
  authProvider: AuthProviderId.default("clerk"),
  deployTargets: DeployTargetsSchema,
  // Relative path (from repo root) to the project's brand config file.
  // Emitted as NEBUTRA_BRAND_CONFIG env var by getFeatureEnvVars.
  // Does NOT duplicate brand identity fields — preset is a sibling pointer only.
  brandConfigPath: z.string().default("brand.config.ts"),
});

export type NebutraConfig = z.infer<typeof NebutraConfigSchema>;
export type NebutraConfigInput = z.input<typeof NebutraConfigSchema>;

// ─── Resolved Config ───

export interface ResolvedConfig {
  apps: Record<z.infer<typeof AppId>, boolean>;
  features: Record<z.infer<typeof FeatureId>, boolean>;
  theme: z.infer<typeof ThemeId>;
  locales: string[];
  defaultLocale: string;
  apiProtocols: z.infer<typeof ApiProtocolId>[];
  authProvider: z.infer<typeof AuthProviderId>;
  deployTargets: DeployTargetMap;
  brandConfigPath: string;
}

// ─── Public API ───

export function defineConfig(config: NebutraConfigInput): NebutraConfig {
  return NebutraConfigSchema.parse(config);
}

export function resolveConfig(config: NebutraConfig): ResolvedConfig {
  return {
    apps: { ...DEFAULT_APPS, ...config.apps },
    features: { ...DEFAULT_FEATURES, ...config.features },
    theme: config.theme,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    apiProtocols: config.apiProtocols,
    authProvider: config.authProvider,
    deployTargets: config.deployTargets,
    brandConfigPath: config.brandConfigPath,
  };
}
