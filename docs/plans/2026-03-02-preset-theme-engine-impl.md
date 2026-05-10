# Scenario Preset System + CSS Theme Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Layer 1 (Scenario Preset System) and Layer 2 (CSS-only Theme Engine) from the multi-scenario template architecture, enabling one-config scenario switching across the monorepo.

**Architecture:** `nebutra.config.ts` at the repo root selects a preset (e.g. `"ai-saas"`) which resolves to a set of enabled apps, features, theme, and locales. The preset system is a pure TypeScript package (`packages/preset`) with Zod schemas, 10 preset definitions, and an env var generator. The theme engine is radically simplified from the original design — instead of a TypeScript token/provider system, it uses a single CSS file (`packages/design/theme/themes.css`) with Tailwind CSS v4 `@theme` + `[data-theme="xxx"]` selectors. `next-themes` (already installed) handles theme switching and persistence.

**Tech Stack:** TypeScript, Zod v3, Vitest, Tailwind CSS v4 (`@theme`), CSS `color-mix()` in OKLCH, next-themes v0.4

---

### Task 1: Create `packages/preset` Package Scaffolding

**Files:**

- Create: `packages/ops/preset/package.json`
- Create: `packages/ops/preset/tsconfig.json`
- Create: `packages/ops/preset/vitest.config.ts`
- Create: `packages/ops/preset/src/index.ts` (empty placeholder)

**Step 1: Create package.json**

```json
{
  "name": "@nebutra/preset",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Scenario preset system — defines which apps, features, and themes each scenario enables",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

**Step 4: Create empty src/index.ts**

```typescript
// @nebutra/preset — public API (populated in Task 5)
export {};
```

**Step 5: Install dependencies**

Run: `pnpm install`

**Step 6: Verify setup**

Run: `pnpm --filter @nebutra/preset typecheck`
Expected: SUCCESS (no errors)

**Step 7: Commit**

```bash
git add packages/ops/preset/
git commit -m "chore: scaffold packages/preset package"
```

---

### Task 2: Zod Config Schema + Types (TDD)

**Files:**

- Create: `packages/ops/preset/src/__tests__/config.test.ts`
- Create: `packages/ops/preset/src/config.ts`

**Step 1: Write the failing test**

```typescript
// packages/ops/preset/src/__tests__/config.test.ts
import { describe, it, expect } from "vitest";
import {
  NebutraConfigSchema,
  PresetId,
  AppId,
  FeatureId,
  ThemeId,
  defineConfig,
  type NebutraConfig,
  type ResolvedConfig,
} from "../config";

describe("NebutraConfigSchema", () => {
  it("parses minimal config with defaults", () => {
    const result = NebutraConfigSchema.parse({});
    expect(result.preset).toBe("full");
    expect(result.theme).toBe("neon");
    expect(result.locales).toEqual(["en"]);
    expect(result.defaultLocale).toBe("en");
  });

  it("parses full config", () => {
    const result = NebutraConfigSchema.parse({
      preset: "ai-saas",
      apps: { web: true, blog: false },
      features: { billing: true, web3: false },
      theme: "gradient",
      locales: ["en", "zh"],
      defaultLocale: "zh",
    });
    expect(result.preset).toBe("ai-saas");
    expect(result.theme).toBe("gradient");
    expect(result.locales).toEqual(["en", "zh"]);
    expect(result.defaultLocale).toBe("zh");
    expect(result.apps).toEqual({ web: true, blog: false });
    expect(result.features).toEqual({ billing: true, web3: false });
  });

  it("rejects invalid preset", () => {
    expect(() => NebutraConfigSchema.parse({ preset: "invalid" })).toThrow();
  });

  it("rejects invalid theme", () => {
    expect(() => NebutraConfigSchema.parse({ theme: "nope" })).toThrow();
  });
});

describe("PresetId", () => {
  it("accepts all 10 preset IDs", () => {
    const ids = [
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
    ];
    for (const id of ids) {
      expect(PresetId.parse(id)).toBe(id);
    }
  });
});

describe("AppId", () => {
  it("accepts all 8 app IDs", () => {
    const ids = [
      "web",
      "landing-page",
      "blog",
      "admin",
      "api-gateway",
      "studio",
      "storybook",
      "docs-hub",
    ];
    for (const id of ids) {
      expect(AppId.parse(id)).toBe(id);
    }
  });
});

describe("FeatureId", () => {
  it("accepts all 14 feature IDs", () => {
    const ids = [
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
    ];
    for (const id of ids) {
      expect(FeatureId.parse(id)).toBe(id);
    }
  });
});

describe("ThemeId", () => {
  it("accepts all 7 theme IDs", () => {
    const ids = [
      "neon",
      "gradient",
      "dark-dense",
      "minimal",
      "vibrant",
      "ocean",
      "custom",
    ];
    for (const id of ids) {
      expect(ThemeId.parse(id)).toBe(id);
    }
  });
});

describe("defineConfig", () => {
  it("returns parsed config with defaults", () => {
    const config = defineConfig({});
    expect(config.preset).toBe("full");
    expect(config.theme).toBe("neon");
  });

  it("accepts partial overrides", () => {
    const config = defineConfig({ preset: "marketing", theme: "gradient" });
    expect(config.preset).toBe("marketing");
    expect(config.theme).toBe("gradient");
  });

  it("throws on invalid input", () => {
    expect(() => defineConfig({ preset: "bad" as any })).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @nebutra/preset test`
Expected: FAIL — `Cannot find module '../config'`

**Step 3: Write config.ts**

```typescript
// packages/ops/preset/src/config.ts
import { z } from "zod";

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

// ─── Config Schema ───

export const NebutraConfigSchema = z.object({
  preset: PresetId.default("full"),
  apps: z.record(AppId, z.boolean()).optional(),
  features: z.record(FeatureId, z.boolean()).optional(),
  theme: ThemeId.default("neon"),
  locales: z.array(z.string()).default(["en"]),
  defaultLocale: z.string().default("en"),
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
}

// ─── Public API ───

export function defineConfig(config: Partial<NebutraConfig>): NebutraConfig {
  return NebutraConfigSchema.parse(config);
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @nebutra/preset test`
Expected: ALL PASS (7 tests)

**Step 5: Commit**

```bash
git add packages/ops/preset/src/config.ts packages/ops/preset/src/__tests__/config.test.ts
git commit -m "feat(preset): add Zod config schema with defineConfig"
```

---

### Task 3: Preset Definitions (TDD)

**Files:**

- Create: `packages/ops/preset/src/__tests__/presets.test.ts`
- Create: `packages/ops/preset/src/presets/ai-saas.ts`
- Create: `packages/ops/preset/src/presets/marketing.ts`
- Create: `packages/ops/preset/src/presets/dashboard.ts`
- Create: `packages/ops/preset/src/presets/overseas.ts`
- Create: `packages/ops/preset/src/presets/growth.ts`
- Create: `packages/ops/preset/src/presets/creative.ts`
- Create: `packages/ops/preset/src/presets/blog-portfolio.ts`
- Create: `packages/ops/preset/src/presets/community.ts`
- Create: `packages/ops/preset/src/presets/one-person.ts`
- Create: `packages/ops/preset/src/presets/full.ts`
- Create: `packages/ops/preset/src/presets/index.ts`

**Step 1: Write the failing test**

```typescript
// packages/ops/preset/src/__tests__/presets.test.ts
import { describe, it, expect } from "vitest";
import { presets, getPreset } from "../presets";
import { PresetId, AppId, FeatureId, ThemeId } from "../config";

describe("presets", () => {
  const allPresetIds = PresetId.options;
  const allAppIds = AppId.options;
  const allFeatureIds = FeatureId.options;

  it("exports all 10 presets", () => {
    expect(Object.keys(presets)).toHaveLength(10);
    for (const id of allPresetIds) {
      expect(presets[id]).toBeDefined();
    }
  });

  it("each preset has all app keys", () => {
    for (const [presetId, preset] of Object.entries(presets)) {
      for (const appId of allAppIds) {
        expect(preset.apps).toHaveProperty(appId, expect.any(Boolean));
      }
    }
  });

  it("each preset has all feature keys", () => {
    for (const [presetId, preset] of Object.entries(presets)) {
      for (const featureId of allFeatureIds) {
        expect(preset.features).toHaveProperty(featureId, expect.any(Boolean));
      }
    }
  });

  it("each preset has a valid theme", () => {
    for (const preset of Object.values(presets)) {
      expect(() => ThemeId.parse(preset.theme)).not.toThrow();
    }
  });

  it("full preset enables all apps and features", () => {
    const full = presets["full"];
    for (const appId of allAppIds) {
      expect(full.apps[appId]).toBe(true);
    }
    for (const featureId of allFeatureIds) {
      expect(full.features[featureId]).toBe(true);
    }
  });

  describe("getPreset", () => {
    it("returns the correct preset by ID", () => {
      const aiSaas = getPreset("ai-saas");
      expect(aiSaas.id).toBe("ai-saas");
      expect(aiSaas.apps.web).toBe(true);
      expect(aiSaas.features.ai).toBe(true);
    });

    it("throws for invalid preset ID", () => {
      expect(() => getPreset("invalid" as any)).toThrow();
    });
  });

  // Scenario-specific spot checks from the mapping table
  describe("scenario mapping", () => {
    it("ai-saas enables web, landing-page, api-gateway; disables blog", () => {
      const p = presets["ai-saas"];
      expect(p.apps.web).toBe(true);
      expect(p.apps["landing-page"]).toBe(true);
      expect(p.apps["api-gateway"]).toBe(true);
      expect(p.apps.blog).toBe(false);
      expect(p.theme).toBe("neon");
    });

    it("marketing enables landing-page, blog, studio; disables web", () => {
      const p = presets["marketing"];
      expect(p.apps["landing-page"]).toBe(true);
      expect(p.apps.blog).toBe(true);
      expect(p.apps.studio).toBe(true);
      expect(p.apps.web).toBe(false);
      expect(p.theme).toBe("gradient");
    });

    it("dashboard enables web, admin, api-gateway; enables sso", () => {
      const p = presets["dashboard"];
      expect(p.apps.web).toBe(true);
      expect(p.apps.admin).toBe(true);
      expect(p.apps["api-gateway"]).toBe(true);
      expect(p.features.sso).toBe(true);
      expect(p.theme).toBe("dark-dense");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @nebutra/preset test`
Expected: FAIL — `Cannot find module '../presets'`

**Step 3: Create all 10 preset files**

Each preset file follows this exact pattern. All 8 app keys and all 14 feature keys must be present.

```typescript
// packages/ops/preset/src/presets/ai-saas.ts
import type { PresetDefinition } from "../config";

export const aiSaas: PresetDefinition = {
  id: "ai-saas",
  name: "AI SaaS",
  description:
    "AI-powered SaaS with billing, multi-tenancy, and provider abstraction",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: true,
    blog: false,
    admin: true,
    storybook: false,
    "docs-hub": true,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    growth: true,
    search: false,
    sso: false,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: true,
    upload: true,
  },
  theme: "neon",
};
```

```typescript
// packages/ops/preset/src/presets/marketing.ts
import type { PresetDefinition } from "../config";

export const marketing: PresetDefinition = {
  id: "marketing",
  name: "Enterprise Marketing",
  description: "Marketing-focused with blog, CMS, and analytics",
  apps: {
    web: false,
    "landing-page": true,
    "api-gateway": false,
    studio: true,
    blog: true,
    admin: false,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: true,
    search: false,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: true,
    realtime: false,
    upload: true,
  },
  theme: "gradient",
};
```

```typescript
// packages/ops/preset/src/presets/dashboard.ts
import type { PresetDefinition } from "../config";

export const dashboard: PresetDefinition = {
  id: "dashboard",
  name: "B2B DevOps Dashboard",
  description:
    "Data-dense dashboard with billing, audit, SSO, and real-time updates",
  apps: {
    web: true,
    "landing-page": false,
    "api-gateway": true,
    studio: false,
    blog: false,
    admin: true,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: true,
    ai: false,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    growth: false,
    search: false,
    sso: true,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: true,
    upload: true,
  },
  theme: "dark-dense",
};
```

```typescript
// packages/ops/preset/src/presets/overseas.ts
import type { PresetDefinition } from "../config";

export const overseas: PresetDefinition = {
  id: "overseas",
  name: "Chinese AI Going Overseas",
  description: "AI SaaS with dual billing, i18n, and overseas growth",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: false,
    blog: true,
    admin: false,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: true,
    search: true,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: true,
    realtime: false,
    upload: false,
  },
  theme: "neon",
};
```

```typescript
// packages/ops/preset/src/presets/growth.ts
import type { PresetDefinition } from "../config";

export const growth: PresetDefinition = {
  id: "growth",
  name: "Product Hunt Growth",
  description:
    "Growth-focused with waitlist, referrals, A/B testing, and community",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
    blog: true,
    admin: false,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: true,
    blog: true,
    growth: true,
    search: false,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: true,
    realtime: false,
    upload: false,
  },
  theme: "gradient",
};
```

```typescript
// packages/ops/preset/src/presets/creative.ts
import type { PresetDefinition } from "../config";

export const creative: PresetDefinition = {
  id: "creative",
  name: "Creative UIUX Showcase",
  description: "Visual-first portfolio with Storybook, blog, and bold theming",
  apps: {
    web: false,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
    blog: true,
    admin: false,
    storybook: true,
    "docs-hub": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: false,
    search: false,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: false,
    realtime: false,
    upload: true,
  },
  theme: "vibrant",
};
```

```typescript
// packages/ops/preset/src/presets/blog-portfolio.ts
import type { PresetDefinition } from "../config";

export const blogPortfolio: PresetDefinition = {
  id: "blog-portfolio",
  name: "Personal Blog/Portfolio",
  description: "Clean blog with CMS, search, newsletter, and community",
  apps: {
    web: false,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
    blog: true,
    admin: false,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: true,
    blog: true,
    growth: false,
    search: true,
    sso: false,
    admin: false,
    analytics: false,
    newsletter: true,
    realtime: false,
    upload: false,
  },
  theme: "minimal",
};
```

```typescript
// packages/ops/preset/src/presets/community.ts
import type { PresetDefinition } from "../config";

export const community: PresetDefinition = {
  id: "community",
  name: "Vertical Domain Community",
  description: "Community platform with search, real-time, blog, and growth",
  apps: {
    web: true,
    "landing-page": false,
    "api-gateway": true,
    studio: false,
    blog: true,
    admin: false,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: true,
    blog: true,
    growth: true,
    search: true,
    sso: false,
    admin: false,
    analytics: false,
    newsletter: true,
    realtime: true,
    upload: true,
  },
  theme: "ocean",
};
```

```typescript
// packages/ops/preset/src/presets/one-person.ts
import type { PresetDefinition } from "../config";

export const onePerson: PresetDefinition = {
  id: "one-person",
  name: "One-Person Company",
  description:
    "Full-stack solo founder setup with billing, AI, blog, and admin",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
    blog: true,
    admin: true,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: true,
    search: false,
    sso: false,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: false,
    upload: false,
  },
  theme: "neon",
};
```

```typescript
// packages/ops/preset/src/presets/full.ts
import type { PresetDefinition } from "../config";

export const full: PresetDefinition = {
  id: "full",
  name: "Full",
  description: "Everything enabled — development default",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: true,
    blog: true,
    admin: true,
    storybook: true,
    "docs-hub": true,
  },
  features: {
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
  },
  theme: "neon",
};
```

**Step 4: Create presets/index.ts**

```typescript
// packages/ops/preset/src/presets/index.ts
import type { PresetDefinition } from "../config";
import { PresetId } from "../config";
import { aiSaas } from "./ai-saas";
import { marketing } from "./marketing";
import { dashboard } from "./dashboard";
import { overseas } from "./overseas";
import { growth } from "./growth";
import { creative } from "./creative";
import { blogPortfolio } from "./blog-portfolio";
import { community } from "./community";
import { onePerson } from "./one-person";
import { full } from "./full";

export const presets: Record<string, PresetDefinition> = {
  "ai-saas": aiSaas,
  marketing: marketing,
  dashboard: dashboard,
  overseas: overseas,
  growth: growth,
  creative: creative,
  "blog-portfolio": blogPortfolio,
  community: community,
  "one-person": onePerson,
  full: full,
};

export function getPreset(id: string): PresetDefinition {
  const parsed = PresetId.parse(id);
  const preset = presets[parsed];
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}
```

**Step 5: Run tests**

Run: `pnpm --filter @nebutra/preset test`
Expected: ALL PASS (config + presets tests)

**Step 6: Commit**

```bash
git add packages/ops/preset/src/presets/ packages/ops/preset/src/__tests__/presets.test.ts
git commit -m "feat(preset): add 10 scenario preset definitions with tests"
```

---

### Task 4: Feature Map — Env Var Generator (TDD)

**Files:**

- Create: `packages/ops/preset/src/__tests__/feature-map.test.ts`
- Create: `packages/ops/preset/src/feature-map.ts`

**Step 1: Write the failing test**

```typescript
// packages/ops/preset/src/__tests__/feature-map.test.ts
import { describe, it, expect } from "vitest";
import {
  getFeatureEnvVars,
  getActiveApps,
  getActivePackages,
} from "../feature-map";
import type { ResolvedConfig } from "../config";

const mockConfig: ResolvedConfig = {
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: false,
    blog: false,
    admin: true,
    storybook: false,
    "docs-hub": false,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    growth: true,
    search: false,
    sso: false,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: true,
    upload: true,
  },
  theme: "neon",
  locales: ["en"],
  defaultLocale: "en",
};

describe("getFeatureEnvVars", () => {
  it("generates FEATURE_FLAG_ env vars for all features", () => {
    const vars = getFeatureEnvVars(mockConfig);
    expect(vars.FEATURE_FLAG_BILLING).toBe("true");
    expect(vars.FEATURE_FLAG_AI).toBe("true");
    expect(vars.FEATURE_FLAG_ECOMMERCE).toBe("false");
    expect(vars.FEATURE_FLAG_WEB3).toBe("false");
    expect(vars.FEATURE_FLAG_GROWTH).toBe("true");
  });

  it("includes theme and locale vars", () => {
    const vars = getFeatureEnvVars(mockConfig);
    expect(vars.NEBUTRA_THEME).toBe("neon");
    expect(vars.NEBUTRA_LOCALES).toBe("en");
    expect(vars.NEBUTRA_DEFAULT_LOCALE).toBe("en");
  });
});

describe("getActiveApps", () => {
  it("returns only enabled app IDs", () => {
    const apps = getActiveApps(mockConfig);
    expect(apps).toEqual(["web", "landing-page", "api-gateway", "admin"]);
  });
});

describe("getActivePackages", () => {
  it("maps app IDs to package names", () => {
    const packages = getActivePackages(mockConfig);
    expect(packages).toContain("@nebutra/web");
    expect(packages).toContain("@nebutra/landing-page");
    expect(packages).toContain("@nebutra/api-gateway");
    expect(packages).toContain("@nebutra/admin");
    expect(packages).not.toContain("@nebutra/blog");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @nebutra/preset test`
Expected: FAIL — `Cannot find module '../feature-map'`

**Step 3: Implement feature-map.ts**

```typescript
// packages/ops/preset/src/feature-map.ts
import type { ResolvedConfig } from "./config";
import { AppId } from "./config";

const APP_PACKAGE_MAP: Record<string, string> = {
  web: "@nebutra/web",
  "landing-page": "@nebutra/landing-page",
  blog: "@nebutra/blog",
  admin: "@nebutra/admin",
  "api-gateway": "@nebutra/api-gateway",
  studio: "@nebutra/studio",
  storybook: "@nebutra/storybook",
  "docs-hub": "@nebutra/docs-hub",
};

export function getFeatureEnvVars(
  config: ResolvedConfig,
): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [feature, enabled] of Object.entries(config.features)) {
    const envKey = `FEATURE_FLAG_${feature.toUpperCase().replace(/-/g, "_")}`;
    vars[envKey] = String(enabled);
  }

  vars.NEBUTRA_THEME = config.theme;
  vars.NEBUTRA_LOCALES = config.locales.join(",");
  vars.NEBUTRA_DEFAULT_LOCALE = config.defaultLocale;

  return vars;
}

export function getActiveApps(config: ResolvedConfig): string[] {
  return Object.entries(config.apps)
    .filter(([, enabled]) => enabled)
    .map(([app]) => app);
}

export function getActivePackages(config: ResolvedConfig): string[] {
  return getActiveApps(config).map((app) => APP_PACKAGE_MAP[app]!);
}
```

**Step 4: Run tests**

Run: `pnpm --filter @nebutra/preset test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/ops/preset/src/feature-map.ts packages/ops/preset/src/__tests__/feature-map.test.ts
git commit -m "feat(preset): add feature-map env var generator"
```

---

### Task 5: resolveConfig + Public API (TDD)

**Files:**

- Create: `packages/ops/preset/src/__tests__/resolve-config.test.ts`
- Modify: `packages/ops/preset/src/config.ts` (add `resolveConfig`)
- Modify: `packages/ops/preset/src/index.ts` (public API)

**Step 1: Write the failing test**

```typescript
// packages/ops/preset/src/__tests__/resolve-config.test.ts
import { describe, it, expect } from "vitest";
import { resolveConfig, defineConfig } from "../config";

describe("resolveConfig", () => {
  it("resolves minimal config using full preset defaults", () => {
    const config = defineConfig({});
    const resolved = resolveConfig(config);
    // "full" preset = everything enabled
    expect(resolved.apps.web).toBe(true);
    expect(resolved.apps.blog).toBe(true);
    expect(resolved.features.billing).toBe(true);
    expect(resolved.features.ai).toBe(true);
    expect(resolved.theme).toBe("neon");
  });

  it("resolves ai-saas preset", () => {
    const config = defineConfig({ preset: "ai-saas" });
    const resolved = resolveConfig(config);
    expect(resolved.apps.web).toBe(true);
    expect(resolved.apps.blog).toBe(false);
    expect(resolved.features.ai).toBe(true);
    expect(resolved.features.web3).toBe(false);
  });

  it("applies user overrides on top of preset", () => {
    const config = defineConfig({
      preset: "ai-saas",
      apps: { blog: true },
      features: { web3: true },
    });
    const resolved = resolveConfig(config);
    // From preset: web=true, blog was false
    expect(resolved.apps.web).toBe(true);
    // Override: blog=true
    expect(resolved.apps.blog).toBe(true);
    // Override: web3=true
    expect(resolved.features.web3).toBe(true);
    // From preset: ai=true (unchanged)
    expect(resolved.features.ai).toBe(true);
  });

  it("preserves locales and theme", () => {
    const config = defineConfig({
      preset: "marketing",
      theme: "vibrant",
      locales: ["en", "zh", "ja"],
      defaultLocale: "zh",
    });
    const resolved = resolveConfig(config);
    expect(resolved.theme).toBe("vibrant");
    expect(resolved.locales).toEqual(["en", "zh", "ja"]);
    expect(resolved.defaultLocale).toBe("zh");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @nebutra/preset test`
Expected: FAIL — `resolveConfig is not a function` (not exported from config.ts yet)

**Step 3: Add resolveConfig to config.ts**

Add this to the bottom of `packages/ops/preset/src/config.ts`:

```typescript
import { getPreset } from "./presets";

export function resolveConfig(config: NebutraConfig): ResolvedConfig {
  const preset = getPreset(config.preset);
  return {
    apps: { ...preset.apps, ...config.apps },
    features: { ...preset.features, ...config.features },
    theme: config.theme,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
  };
}
```

**Step 4: Run tests**

Run: `pnpm --filter @nebutra/preset test`
Expected: ALL PASS

**Step 5: Write public API index.ts**

```typescript
// packages/ops/preset/src/index.ts
// Config schema and types
export {
  NebutraConfigSchema,
  PresetId,
  AppId,
  FeatureId,
  ThemeId,
  defineConfig,
  resolveConfig,
  type NebutraConfig,
  type ResolvedConfig,
  type PresetDefinition,
} from "./config";

// Presets
export { presets, getPreset } from "./presets";

// Feature map
export {
  getFeatureEnvVars,
  getActiveApps,
  getActivePackages,
} from "./feature-map";
```

**Step 6: Run typecheck**

Run: `pnpm --filter @nebutra/preset typecheck`
Expected: SUCCESS

**Step 7: Commit**

```bash
git add packages/ops/preset/src/config.ts packages/ops/preset/src/index.ts packages/ops/preset/src/__tests__/resolve-config.test.ts
git commit -m "feat(preset): add resolveConfig and public API"
```

---

### Task 6: Root `nebutra.config.ts` + Static Build Scripts

**Files:**

- Create: `nebutra.config.ts` (monorepo root)
- Modify: `package.json` (root — add scenario scripts)

**Step 1: Create nebutra.config.ts**

```typescript
// nebutra.config.ts
import { defineConfig } from "@nebutra/preset";

export default defineConfig({
  preset: "ai-saas",
  theme: "neon",
  locales: ["en", "zh"],
  defaultLocale: "en",
});
```

**Step 2: Add static build scripts to root package.json**

Add these scripts to root `package.json` under `"scripts"`:

```json
{
  "dev:ai-saas": "turbo run dev --filter=@nebutra/web --filter=@nebutra/landing-page --filter=@nebutra/api-gateway --filter=@nebutra/studio --filter=@nebutra/admin --filter=@nebutra/docs-hub",
  "dev:marketing": "turbo run dev --filter=@nebutra/landing-page --filter=@nebutra/blog --filter=@nebutra/studio",
  "dev:dashboard": "turbo run dev --filter=@nebutra/web --filter=@nebutra/admin --filter=@nebutra/api-gateway",
  "dev:overseas": "turbo run dev --filter=@nebutra/web --filter=@nebutra/landing-page --filter=@nebutra/api-gateway --filter=@nebutra/blog",
  "dev:growth": "turbo run dev --filter=@nebutra/web --filter=@nebutra/landing-page --filter=@nebutra/blog",
  "dev:creative": "turbo run dev --filter=@nebutra/landing-page --filter=@nebutra/blog --filter=@nebutra/storybook",
  "dev:blog": "turbo run dev --filter=@nebutra/landing-page --filter=@nebutra/blog",
  "dev:community": "turbo run dev --filter=@nebutra/web --filter=@nebutra/api-gateway --filter=@nebutra/blog",
  "dev:solo": "turbo run dev --filter=@nebutra/web --filter=@nebutra/landing-page --filter=@nebutra/admin --filter=@nebutra/blog",
  "build:ai-saas": "turbo run build --filter=@nebutra/web --filter=@nebutra/landing-page --filter=@nebutra/api-gateway --filter=@nebutra/studio --filter=@nebutra/admin --filter=@nebutra/docs-hub",
  "build:marketing": "turbo run build --filter=@nebutra/landing-page --filter=@nebutra/blog --filter=@nebutra/studio",
  "build:dashboard": "turbo run build --filter=@nebutra/web --filter=@nebutra/admin --filter=@nebutra/api-gateway",
  "preset:env": "tsx packages/ops/preset/src/cli.ts"
}
```

**Step 3: Create a minimal CLI for env generation**

```typescript
// packages/ops/preset/src/cli.ts
import { resolveConfig, defineConfig, getFeatureEnvVars } from "./index";

async function main() {
  // Dynamic import of the root config
  const configModule = await import("../../../nebutra.config");
  const config = configModule.default;
  const resolved = resolveConfig(config);
  const envVars = getFeatureEnvVars(resolved);

  const lines = Object.entries(envVars)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);

  process.stdout.write(lines.join("\n") + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
```

**Step 4: Verify CLI works**

Run: `pnpm preset:env`
Expected: Outputs env vars like:

```
FEATURE_FLAG_ADMIN=true
FEATURE_FLAG_AI=true
FEATURE_FLAG_ANALYTICS=true
FEATURE_FLAG_BILLING=true
...
NEBUTRA_DEFAULT_LOCALE=en
NEBUTRA_LOCALES=en,zh
NEBUTRA_THEME=neon
```

**Step 5: Commit**

```bash
git add nebutra.config.ts packages/ops/preset/src/cli.ts package.json
git commit -m "feat(preset): add root nebutra.config.ts, static build scripts, and CLI"
```

---

### Task 7: Create `packages/theme` Package Scaffolding

**Files:**

- Create: `packages/design/theme/package.json`
- Create: `packages/design/theme/tsconfig.json`
- Create: `packages/design/theme/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@nebutra/theme",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "CSS-only theme engine — Tailwind v4 @theme tokens + data-theme selectors + next-themes re-export",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./themes.css": "./themes.css"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next-themes": "^0.4.6"
  },
  "devDependencies": {
    "@types/react": "^19",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "react": "^19"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create src/index.ts**

```typescript
// packages/design/theme/src/index.ts
// Re-export next-themes for convenience — all apps import from @nebutra/theme
export { ThemeProvider, useTheme } from "next-themes";
export type { ThemeProviderProps } from "next-themes";

// Theme IDs must match [data-theme] selectors in themes.css
export const THEME_IDS = [
  "neon",
  "gradient",
  "dark-dense",
  "minimal",
  "vibrant",
  "ocean",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];
```

**Step 4: Install dependencies**

Run: `pnpm install`

**Step 5: Verify typecheck**

Run: `pnpm --filter @nebutra/theme typecheck`
Expected: SUCCESS

**Step 6: Commit**

```bash
git add packages/design/theme/
git commit -m "chore: scaffold packages/theme with next-themes re-export"
```

---

### Task 8: Create `themes.css` with 6 Theme Presets

**Files:**

- Create: `packages/design/theme/themes.css`

This is the heart of Layer 2. All design tokens are defined in CSS using OKLCH colors and Tailwind v4 `@theme`.

**Step 1: Create themes.css**

```css
/* packages/design/theme/themes.css
 *
 * Nebutra Theme Engine — CSS-only
 *
 * Architecture:
 *   @theme block       → registers tokens with Tailwind v4 (utilities: bg-primary, text-muted, etc.)
 *   [data-theme="xxx"] → overrides token values per scenario
 *   color-mix()        → derives hover/active states without JS
 *
 * Default theme: "neon" (AI SaaS) — applied when no data-theme attribute is set
 *
 * Integration:
 *   1. Import this file in each app's globals.css AFTER @import "tailwindcss"
 *   2. Configure next-themes with attribute="data-theme" defaultTheme="neon"
 *   3. Set data-theme via preset config or user preference
 */

/* ─── Default Theme Tokens (neon) ─── */

@theme {
  /* Brand Colors */
  --color-primary: oklch(0.541 0.281 293.5);
  --color-primary-foreground: oklch(1 0 0);
  --color-secondary: oklch(0.715 0.143 215.2);
  --color-secondary-foreground: oklch(1 0 0);
  --color-accent: oklch(0.714 0.203 305.5);
  --color-accent-foreground: oklch(0.141 0.005 285.9);

  /* Semantic Surfaces */
  --color-background: oklch(0.141 0.005 285.9);
  --color-foreground: oklch(0.985 0 0);
  --color-card: oklch(0.212 0.006 285.9);
  --color-card-foreground: oklch(0.985 0 0);
  --color-popover: oklch(0.212 0.006 285.9);
  --color-popover-foreground: oklch(0.985 0 0);
  --color-muted: oklch(0.274 0.006 286);
  --color-muted-foreground: oklch(0.705 0.015 286);
  --color-border: oklch(0.274 0.006 286);
  --color-input: oklch(0.274 0.006 286);
  --color-ring: oklch(0.541 0.281 293.5);

  /* Status Colors */
  --color-destructive: oklch(0.577 0.245 27.3);
  --color-destructive-foreground: oklch(1 0 0);
  --color-success: oklch(0.723 0.219 149.6);
  --color-success-foreground: oklch(1 0 0);
  --color-warning: oklch(0.769 0.189 70.1);
  --color-warning-foreground: oklch(0.141 0.005 285.9);
  --color-info: oklch(0.623 0.214 259.1);
  --color-info-foreground: oklch(1 0 0);

  /* Derived (hover/active via color-mix) */
  --color-primary-hover: color-mix(
    in oklch,
    oklch(0.541 0.281 293.5),
    white 15%
  );
  --color-primary-active: color-mix(
    in oklch,
    oklch(0.541 0.281 293.5),
    black 10%
  );

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
  --font-heading: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.5);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ─── Gradient Theme (Marketing, Growth) ─── */

[data-theme="gradient"] {
  --color-primary: oklch(0.546 0.245 262.9);
  --color-primary-foreground: oklch(1 0 0);
  --color-secondary: oklch(0.707 0.165 254.6);
  --color-secondary-foreground: oklch(1 0 0);
  --color-accent: oklch(0.623 0.214 259.1);
  --color-accent-foreground: oklch(1 0 0);

  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.141 0.005 285.9);
  --color-card: oklch(0.985 0 0);
  --color-card-foreground: oklch(0.141 0.005 285.9);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.141 0.005 285.9);
  --color-muted: oklch(0.967 0.001 286);
  --color-muted-foreground: oklch(0.552 0.016 286);
  --color-border: oklch(0.922 0.004 286);
  --color-input: oklch(0.922 0.004 286);
  --color-ring: oklch(0.546 0.245 262.9);

  --color-primary-hover: color-mix(
    in oklch,
    oklch(0.546 0.245 262.9),
    black 10%
  );
  --color-primary-active: color-mix(
    in oklch,
    oklch(0.546 0.245 262.9),
    black 20%
  );

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

/* ─── Dark Dense Theme (DevOps Dashboard) ─── */

[data-theme="dark-dense"] {
  --color-primary: oklch(0.696 0.17 162.5);
  --color-primary-foreground: oklch(1 0 0);
  --color-secondary: oklch(0.527 0.154 163.2);
  --color-secondary-foreground: oklch(1 0 0);
  --color-accent: oklch(0.765 0.163 163.4);
  --color-accent-foreground: oklch(0.141 0.005 285.9);

  --color-background: oklch(0.112 0 0);
  --color-foreground: oklch(0.985 0 0);
  --color-card: oklch(0.162 0.004 285.9);
  --color-card-foreground: oklch(0.985 0 0);
  --color-popover: oklch(0.162 0.004 285.9);
  --color-popover-foreground: oklch(0.985 0 0);
  --color-muted: oklch(0.215 0.006 285.9);
  --color-muted-foreground: oklch(0.705 0.015 286);
  --color-border: oklch(0.215 0.006 285.9);
  --color-input: oklch(0.215 0.006 285.9);
  --color-ring: oklch(0.696 0.17 162.5);

  --color-primary-hover: color-mix(
    in oklch,
    oklch(0.696 0.17 162.5),
    white 15%
  );
  --color-primary-active: color-mix(
    in oklch,
    oklch(0.696 0.17 162.5),
    black 10%
  );

  --radius-sm: 0.125rem;
  --radius-md: 0.25rem;
  --radius-lg: 0.25rem;
  --radius-xl: 0.375rem;

  --font-sans: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
  --font-heading: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
}

/* ─── Minimal Theme (Blog/Portfolio) ─── */

[data-theme="minimal"] {
  --color-primary: oklch(0.21 0.006 285.9);
  --color-primary-foreground: oklch(1 0 0);
  --color-secondary: oklch(0.442 0.017 285.9);
  --color-secondary-foreground: oklch(1 0 0);
  --color-accent: oklch(0.552 0.016 286);
  --color-accent-foreground: oklch(1 0 0);

  --color-background: oklch(0.985 0 0);
  --color-foreground: oklch(0.141 0.005 285.9);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.141 0.005 285.9);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.141 0.005 285.9);
  --color-muted: oklch(0.967 0.001 286);
  --color-muted-foreground: oklch(0.552 0.016 286);
  --color-border: oklch(0.922 0.004 286);
  --color-input: oklch(0.922 0.004 286);
  --color-ring: oklch(0.21 0.006 285.9);

  --color-primary-hover: color-mix(
    in oklch,
    oklch(0.21 0.006 285.9),
    white 20%
  );
  --color-primary-active: color-mix(
    in oklch,
    oklch(0.21 0.006 285.9),
    white 10%
  );

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  --font-heading: "Playfair Display", ui-serif, Georgia, serif;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.07);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.07);
}

/* ─── Vibrant Theme (Creative UIUX) ─── */

[data-theme="vibrant"] {
  --color-primary: oklch(0.705 0.213 47.6);
  --color-primary-foreground: oklch(1 0 0);
  --color-secondary: oklch(0.769 0.189 70.1);
  --color-secondary-foreground: oklch(0.141 0.005 285.9);
  --color-accent: oklch(0.645 0.246 16.4);
  --color-accent-foreground: oklch(1 0 0);

  --color-background: oklch(0.991 0.015 95.3);
  --color-foreground: oklch(0.141 0.005 285.9);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.141 0.005 285.9);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.141 0.005 285.9);
  --color-muted: oklch(0.967 0.012 90);
  --color-muted-foreground: oklch(0.552 0.016 286);
  --color-border: oklch(0.922 0.008 80);
  --color-input: oklch(0.922 0.008 80);
  --color-ring: oklch(0.705 0.213 47.6);

  --color-primary-hover: color-mix(
    in oklch,
    oklch(0.705 0.213 47.6),
    black 10%
  );
  --color-primary-active: color-mix(
    in oklch,
    oklch(0.705 0.213 47.6),
    black 20%
  );

  --radius-sm: 0.75rem;
  --radius-md: 1rem;
  --radius-lg: 1.5rem;
  --radius-xl: 9999px;

  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;

  --shadow-sm: 0 1px 3px 0 rgb(249 115 22 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(249 115 22 / 0.15);
  --shadow-lg: 0 10px 15px -3px rgb(249 115 22 / 0.15);
  --shadow-xl: 0 20px 25px -5px rgb(249 115 22 / 0.15);
}

/* ─── Ocean Theme (Community) ─── */

[data-theme="ocean"] {
  --color-primary: oklch(0.609 0.126 199.8);
  --color-primary-foreground: oklch(1 0 0);
  --color-secondary: oklch(0.715 0.143 215.2);
  --color-secondary-foreground: oklch(1 0 0);
  --color-accent: oklch(0.777 0.152 181.9);
  --color-accent-foreground: oklch(0.141 0.005 285.9);

  --color-background: oklch(0.982 0.018 180.7);
  --color-foreground: oklch(0.141 0.005 285.9);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.141 0.005 285.9);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.141 0.005 285.9);
  --color-muted: oklch(0.953 0.024 184);
  --color-muted-foreground: oklch(0.442 0.017 285.9);
  --color-border: oklch(0.905 0.032 185);
  --color-input: oklch(0.905 0.032 185);
  --color-ring: oklch(0.609 0.126 199.8);

  --color-primary-hover: color-mix(
    in oklch,
    oklch(0.609 0.126 199.8),
    black 10%
  );
  --color-primary-active: color-mix(
    in oklch,
    oklch(0.609 0.126 199.8),
    black 20%
  );

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --shadow-sm: 0 1px 2px 0 rgb(8 145 178 / 0.08);
  --shadow-md: 0 4px 6px -1px rgb(8 145 178 / 0.12);
  --shadow-lg: 0 10px 15px -3px rgb(8 145 178 / 0.12);
  --shadow-xl: 0 20px 25px -5px rgb(8 145 178 / 0.12);
}
```

**Step 2: Verify file was created**

Run: `ls -la packages/design/theme/themes.css`
Expected: File exists

**Step 3: Commit**

```bash
git add packages/design/theme/themes.css
git commit -m "feat(theme): add CSS-only theme engine with 6 scenario presets"
```

---

### Task 9: Wire Themes into App Layouts

**Files:**

- Modify: `apps/landing-page/src/app/globals.css` (add themes.css import)
- Modify: `apps/landing-page/src/app/providers.tsx` (update next-themes config)
- Modify: `apps/web/src/app/globals.css` (add themes.css import)
- Check/Modify: `apps/web/src/app/providers.tsx` or equivalent (update next-themes config)

**Step 1: Read current globals.css files to understand import order**

Read these files before editing:

- `apps/landing-page/src/app/globals.css`
- `apps/web/src/app/globals.css`
- `apps/landing-page/src/app/providers.tsx`
- `apps/web/src/app/providers.tsx` (may not exist — check `apps/web/src/app/layout.tsx`)

**Step 2: Add themes.css import to landing-page globals.css**

Add this line near the top of the file, AFTER `@import "tailwindcss"` and BEFORE `@custom-variant`:

```css
@import "@nebutra/theme/themes.css";
```

**Step 3: Update landing-page providers.tsx**

Change next-themes config from:

```typescript
<NextThemesProvider
  attribute="class"
  forcedTheme="dark"
  disableTransitionOnChange
>
```

To:

```typescript
<NextThemesProvider
  attribute="data-theme"
  defaultTheme="neon"
  themes={["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean"]}
  disableTransitionOnChange
>
```

> **Note:** Remove `forcedTheme="dark"` — the neon theme IS dark by default. Apps that need to force a theme can use `forcedTheme` locally. The `attribute="data-theme"` matches our CSS selectors.

**Step 4: Add themes.css import to web globals.css**

Same pattern — add after `@import "tailwindcss"` (or equivalent import):

```css
@import "@nebutra/theme/themes.css";
```

**Step 5: Wire next-themes in web app**

Check if `apps/web` already has a providers component. If not, create one following the same pattern as landing-page. Configure:

```typescript
<NextThemesProvider
  attribute="data-theme"
  defaultTheme="neon"
  themes={["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean"]}
  disableTransitionOnChange
>
```

**Step 6: Install dependency**

Ensure apps have @nebutra/theme as a workspace dependency:

```bash
pnpm --filter @nebutra/landing-page add @nebutra/theme@workspace:*
pnpm --filter @nebutra/web add @nebutra/theme@workspace:*
```

**Step 7: Verify dev server starts**

Run: `pnpm --filter @nebutra/landing-page dev`
Expected: Dev server starts without CSS errors. Page renders with neon theme colors.

**Step 8: Commit**

```bash
git add apps/landing-page/ apps/web/ packages/design/theme/
git commit -m "feat(theme): wire themes.css into landing-page and web apps"
```

---

### Task 10: Integration — Preset + Theme End-to-End

**Files:**

- Create: `packages/ops/preset/src/__tests__/integration.test.ts`

**Step 1: Write integration test**

```typescript
// packages/ops/preset/src/__tests__/integration.test.ts
import { describe, it, expect } from "vitest";
import {
  defineConfig,
  resolveConfig,
  getFeatureEnvVars,
  getActiveApps,
  presets,
} from "../index";

describe("preset → theme integration", () => {
  it("each preset resolves to a valid theme", () => {
    const validThemes = [
      "neon",
      "gradient",
      "dark-dense",
      "minimal",
      "vibrant",
      "ocean",
      "custom",
    ];
    for (const [id, preset] of Object.entries(presets)) {
      const config = defineConfig({ preset: id as any });
      const resolved = resolveConfig(config);
      expect(validThemes).toContain(resolved.theme);
    }
  });

  it("full end-to-end: config → resolve → env vars", () => {
    const config = defineConfig({
      preset: "ai-saas",
      theme: "neon",
      locales: ["en", "zh"],
    });
    const resolved = resolveConfig(config);
    const envVars = getFeatureEnvVars(resolved);
    const activeApps = getActiveApps(resolved);

    // Theme
    expect(envVars.NEBUTRA_THEME).toBe("neon");

    // Apps
    expect(activeApps).toContain("web");
    expect(activeApps).toContain("landing-page");
    expect(activeApps).not.toContain("blog");

    // Features
    expect(envVars.FEATURE_FLAG_AI).toBe("true");
    expect(envVars.FEATURE_FLAG_BILLING).toBe("true");
    expect(envVars.FEATURE_FLAG_WEB3).toBe("false");

    // Locales
    expect(envVars.NEBUTRA_LOCALES).toBe("en,zh");
  });

  it("user overrides merge correctly", () => {
    const config = defineConfig({
      preset: "marketing",
      apps: { web: true },
      features: { ai: true },
      theme: "vibrant",
    });
    const resolved = resolveConfig(config);

    // From preset: landing-page=true
    expect(resolved.apps["landing-page"]).toBe(true);
    // Override: web=true (was false in marketing)
    expect(resolved.apps.web).toBe(true);
    // Override: ai=true (was false in marketing)
    expect(resolved.features.ai).toBe(true);
    // Override: theme=vibrant (was gradient in marketing)
    expect(resolved.theme).toBe("vibrant");
  });
});
```

**Step 2: Run all tests**

Run: `pnpm --filter @nebutra/preset test`
Expected: ALL PASS

**Step 3: Run full typecheck**

Run: `pnpm --filter @nebutra/preset typecheck && pnpm --filter @nebutra/theme typecheck`
Expected: SUCCESS

**Step 4: Run full monorepo build (landing-page)**

Run: `pnpm --filter @nebutra/landing-page build`
Expected: Build succeeds — themes.css is bundled correctly

**Step 5: Commit**

```bash
git add packages/ops/preset/src/__tests__/integration.test.ts
git commit -m "test(preset): add integration tests for preset → theme flow"
```

---

### Task 11: Final Cleanup + Verification

**Files:**

- No new files — this is a verification task

**Step 1: Verify zero import errors**

Run: `pnpm --filter @nebutra/preset typecheck && pnpm --filter @nebutra/theme typecheck`
Expected: SUCCESS

**Step 2: Run all preset tests**

Run: `pnpm --filter @nebutra/preset test`
Expected: ALL PASS

**Step 3: Verify no console.log statements**

Run: `grep -r "console.log" packages/ops/preset/src/ packages/design/theme/src/ --include="*.ts" --include="*.tsx"`
Expected: Empty (no console.log in source files)

**Step 4: Verify test coverage**

Run: `pnpm --filter @nebutra/preset test -- --coverage`
Expected: >80% coverage on config.ts, feature-map.ts, presets/index.ts

**Step 5: Verify CLI outputs correct env vars**

Run: `pnpm preset:env`
Expected: Clean env var output matching ai-saas preset

**Step 6: Verify landing-page builds**

Run: `pnpm --filter @nebutra/landing-page build`
Expected: Build succeeds

**Step 7: Manual dev verification (if time permits)**

Run: `pnpm --filter @nebutra/landing-page dev`
Verify in browser:

- `http://localhost:3000` → renders with neon theme colors
- Browser DevTools → `<html>` has `data-theme="neon"` attribute
- CSS vars like `--color-primary` are set on `:root`

---

## Summary

| Task | Description                         | Packages                    |
| ---- | ----------------------------------- | --------------------------- |
| 1    | Scaffold packages/preset            | @nebutra/preset             |
| 2    | Zod config schema (TDD)             | @nebutra/preset             |
| 3    | 10 preset definitions (TDD)         | @nebutra/preset             |
| 4    | Feature-map env var generator (TDD) | @nebutra/preset             |
| 5    | resolveConfig + public API (TDD)    | @nebutra/preset             |
| 6    | Root nebutra.config.ts + scripts    | root                        |
| 7    | Scaffold packages/theme             | @nebutra/theme              |
| 8    | themes.css with 6 presets           | @nebutra/theme              |
| 9    | Wire themes into app layouts        | apps/landing-page, apps/web |
| 10   | Integration tests                   | @nebutra/preset             |
| 11   | Final cleanup + verification        | all                         |

**Estimated commits:** 9 (one per task except scaffolding/verification share)

**Key design decisions applied:**

- ❌ DELETED: `turbo-filter.ts` → static npm scripts instead
- ❌ DELETED: TypeScript token system, ThemeProvider, tailwind-plugin.ts, utils.ts
- ✅ ADDED: Pure CSS themes.css with Tailwind v4 `@theme` + `[data-theme]`
- ✅ REUSED: `next-themes` (already installed) for theme switching
- ✅ REUSED: Zod v3 (matches existing packages/config pattern)
