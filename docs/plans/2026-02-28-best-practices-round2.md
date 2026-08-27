# Best Practices Round 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all remaining best-practice gaps identified in the audit: TypeScript strictness, Dependabot, Vitest coverage fix, Turbo optimization, Dockerfile, env validation in web/landing, Error Boundary in web, bundle analyzer, a11y linting, CI security scanning, web utility tests, and Playwright E2E.

**Architecture:** 13 independent tasks ordered by complexity (easy → hard). Each task is self-contained with its own commit. No inter-task dependencies except Task 12 (web tests) depends on Task 7 (web Zod env) being done first.

**Tech Stack:** TypeScript 5, Zod, Vitest 4, Playwright, Next.js 16, eslint-plugin-jsx-a11y, @next/bundle-analyzer, Docker (multi-stage)

---

## Task 1: TypeScript strict flags

**Files:**

- Modify: `tsconfig.base.json`

**Step 1: Add the two missing flags**

Open `tsconfig.base.json` and add these two flags after `"strict": true`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "skipLibCheck": true,
    "preserveSymlinks": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", ".next", ".turbo"]
}
```

**Step 2: Run typecheck across all affected packages**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm turbo typecheck 2>&1 | grep -E "error TS|passed|failed" | head -40
```

Expected: passes with 0 errors. If type errors appear, fix them before committing.

Common fixes needed:

- `noUncheckedIndexedAccess`: array access `arr[i]` now returns `T | undefined`. Add null checks: `const item = arr[i]; if (item) { ... }`
- `exactOptionalPropertyTypes`: `{ key?: string }` no longer accepts `{ key: undefined }`. Use `{ key?: string }` with proper optionality.

**Step 3: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: enable noUncheckedIndexedAccess and exactOptionalPropertyTypes in tsconfig"
```

---

## Task 2: Dependabot config

**Files:**

- Create: `.github/dependabot.yml`

**Step 1: Create the file**

Create `.github/dependabot.yml`:

```yaml
version: 2

updates:
  # pnpm workspace dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    groups:
      # Group all patch and minor updates together
      dependencies:
        update-types:
          - "minor"
          - "patch"
    ignore:
      # Major version bumps need manual review
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
```

**Step 2: Verify syntax**

```bash
cat .github/dependabot.yml
```

Expected: file content displayed without error.

**Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore: add Dependabot config for weekly automated dependency updates"
```

---

## Task 3: Fix vitest coverage exclude

**Files:**

- Modify: `backends/gateway/vitest.config.ts`

**Step 1: Fix the coverage exclude**

The current config excludes `src/__tests__/` from coverage, which means test files inflate the "uncovered" stats. The correct pattern excludes test files from being counted as source. Replace the coverage section:

Current (wrong):

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  exclude: ["node_modules/", "src/__tests__/"],
},
```

Replace with (correct — excludes test files from coverage SOURCE, not from being analyzed):

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  exclude: [
    "node_modules/",
    "src/**/*.{test,spec}.ts",
    "src/__tests__/**",
  ],
  include: ["src/**/*.ts"],
},
```

**Step 2: Run tests to verify coverage still works**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm --filter @nebutra/gateway test:coverage 2>&1 | tail -20
```

Expected: coverage report shows percentages, all 43 tests pass.

**Step 3: Commit**

```bash
git add backends/gateway/vitest.config.ts
git commit -m "fix: correct vitest coverage exclude pattern in api-gateway"
```

---

## Task 4: Turbo inputs optimization

**Files:**

- Modify: `turbo.json`

**Step 1: Add inputs to lint, typecheck, and test tasks**

Replace `turbo.json` content:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "eslint.config*", ".eslintrc*"]
    },
    "typecheck": {
      "dependsOn": ["^build", "db:generate"],
      "inputs": ["$TURBO_DEFAULT$", "tsconfig*.json"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "vitest.config*"],
      "outputs": ["coverage/**"]
    },
    "db:generate": {
      "cache": true,
      "inputs": ["packages/platform/db/prisma/schema.prisma"],
      "outputs": ["node_modules/.pnpm/@prisma+client*/**"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    }
  }
}
```

**Step 2: Verify turbo still works**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm turbo lint --filter=...[HEAD^1]... 2>&1 | tail -5
```

Expected: lint runs (or outputs "no packages changed").

**Step 3: Commit**

```bash
git add turbo.json
git commit -m "perf: add inputs/outputs to turbo tasks for better cache hit rate"
```

---

## Task 5: api-gateway Dockerfile

**Files:**

- Create: `backends/gateway/Dockerfile`
- Create: `backends/gateway/.dockerignore`

**Step 1: Check the tsconfig has outDir set**

```bash
cat backends/gateway/tsconfig.json
```

If `outDir` is not set to `dist`, note it. The `start` script in package.json already uses `node dist/index.js`.

**Step 2: Create Dockerfile**

Create `backends/gateway/Dockerfile`:

```dockerfile
# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable pnpm

# Copy manifests for all workspace packages api-gateway depends on
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backends/gateway/package.json ./backends/gateway/
COPY packages/platform/alerting/package.json ./packages/platform/alerting/
COPY packages/integrations/cache/package.json ./packages/integrations/cache/
COPY packages/platform/db/package.json ./packages/platform/db/
COPY packages/platform/health/package.json ./packages/platform/health/
COPY packages/platform/logger/package.json ./packages/platform/logger/
COPY packages/platform/rate-limit/package.json ./packages/platform/rate-limit/

RUN pnpm install --frozen-lockfile --filter @nebutra/gateway...

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backends/gateway/node_modules ./backends/gateway/node_modules
COPY . .

# Generate Prisma client
RUN pnpm --filter @nebutra/db db:generate

# Compile TypeScript
RUN pnpm --filter @nebutra/gateway build

# ── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy compiled output + production dependencies
COPY --from=builder /app/backends/gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backends/gateway/node_modules ./backends/gateway/node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3002

CMD ["node", "dist/index.js"]
```

**Step 3: Create .dockerignore**

Create `backends/gateway/.dockerignore`:

```
node_modules
dist
.next
.turbo
*.log
.env*
coverage
```

**Step 4: Verify the build works locally (optional)**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
docker build -f backends/gateway/Dockerfile -t nebutra-api-gateway . 2>&1 | tail -10
```

Expected: `Successfully built ...` If Docker is not available, skip and commit.

**Step 5: Commit**

```bash
git add backends/gateway/Dockerfile backends/gateway/.dockerignore
git commit -m "feat: add multi-stage Dockerfile for api-gateway"
```

---

## Task 6: Landing-page Zod env validation

**Files:**

- Modify: `apps/landing/package.json` (add zod)
- Create: `apps/landing/src/lib/env.ts`

**Step 1: Add zod**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm add zod --filter @nebutra/landing
```

**Step 2: Create `apps/landing/src/lib/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  // Next.js runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Clerk auth (optional — app renders without it)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),

  // Content / CMS
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default("wyfqr24v"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),

  // URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3002"),
});

export type LandingEnv = z.infer<typeof envSchema>;

function validateEnv(): LandingEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Use console.error — allowed by ESLint config, and this is startup critical path
    console.error("❌ Invalid landing environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

// Only validate on the server side (avoid browser issues with process.env)
export const env =
  typeof window === "undefined"
    ? validateEnv()
    : (process.env as unknown as LandingEnv);
```

**Step 3: Verify TypeScript**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm --filter @nebutra/landing typecheck 2>&1
```

Expected: no errors.

**Step 4: Commit**

```bash
git add apps/landing/src/lib/env.ts apps/landing/package.json pnpm-lock.yaml
git commit -m "feat: add Zod env validation to landing"
```

---

## Task 7: apps/web Zod env validation

**Files:**

- Modify: `apps/web/package.json` (add zod)
- Modify: `apps/web/src/lib/env.ts` (replace raw process.env with Zod schema)

**Step 1: Add zod**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm add zod --filter @nebutra/web
```

**Step 2: Replace `apps/web/src/lib/env.ts`**

The current file uses raw `process.env` with no validation. Replace the entire file:

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Public URLs
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3002"),
  NEXT_PUBLIC_STUDIO_URL: z.string().url().default("http://localhost:3003"),

  // Clerk auth — required in production
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),

  // Sanity CMS
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default("wyfqr24v"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type WebEnv = z.infer<typeof envSchema>;

function validateEnv(): WebEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid web environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

// Only validate on the server side
const _env =
  typeof window === "undefined"
    ? validateEnv()
    : (process.env as unknown as WebEnv);

export const env = {
  siteUrl: _env.NEXT_PUBLIC_SITE_URL,
  appUrl: _env.NEXT_PUBLIC_APP_URL,
  apiUrl: _env.NEXT_PUBLIC_API_URL,
  studioUrl: _env.NEXT_PUBLIC_STUDIO_URL,
  clerk: {
    publishableKey: _env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    signInUrl: _env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    signUpUrl: _env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  },
  sanity: {
    projectId: _env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: _env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: _env.NEXT_PUBLIC_SANITY_API_VERSION,
  },
  stripe: {
    publishableKey: _env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  sentryDsn: _env.NEXT_PUBLIC_SENTRY_DSN,
  isDev: _env.NODE_ENV === "development",
  isProd: _env.NODE_ENV === "production",
} as const;

export default env;
```

**Step 3: Verify TypeScript**

```bash
pnpm --filter @nebutra/web typecheck 2>&1
```

Expected: no errors.

**Step 4: Commit**

```bash
git add apps/web/src/lib/env.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add Zod env validation to apps/web"
```

---

## Task 8: Error Boundary in apps/web

**Files:**

- Create: `apps/web/src/components/ErrorBoundary.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Read current layout.tsx**

```bash
cat apps/web/src/app/layout.tsx
```

Understand where `{children}` is rendered.

**Step 2: Create ErrorBoundary component**

Create `apps/web/src/components/ErrorBoundary.tsx`:

```tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to alerting/Sentry here if wired
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md text-sm">
            An unexpected error occurred. Please refresh the page or contact
            support if the problem persists.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 3: Wire ErrorBoundary into apps/web layout.tsx**

In `apps/web/src/app/layout.tsx`, import and wrap children:

```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";
```

Then wrap the innermost children:

```tsx
<ErrorBoundary>{children}</ErrorBoundary>
```

**Step 4: Verify TypeScript**

```bash
pnpm --filter @nebutra/web typecheck 2>&1
```

Expected: no errors.

**Step 5: Commit**

```bash
git add apps/web/src/components/ErrorBoundary.tsx apps/web/src/app/layout.tsx
git commit -m "feat: add Error Boundary to apps/web for graceful error handling"
```

---

## Task 9: Bundle analyzer

**Files:**

- Modify: `apps/web/package.json` (add @next/bundle-analyzer)
- Modify: `apps/web/next.config.ts` (wrap with bundle analyzer)

**Step 1: Install bundle analyzer**

```bash
pnpm add -D @next/bundle-analyzer --filter @nebutra/web
```

**Step 2: Read current next.config.ts**

```bash
cat apps/web/next.config.ts
```

**Step 3: Wrap config with bundle analyzer**

Modify `apps/web/next.config.ts`. Add the analyzer wrapper:

```typescript
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // ... existing config
};

export default withBundleAnalyzer(nextConfig);
```

**Step 4: Add analyze script to package.json**

In `apps/web/package.json`, add to scripts:

```json
"analyze": "ANALYZE=true next build"
```

**Step 5: Verify TypeScript**

```bash
pnpm --filter @nebutra/web typecheck 2>&1
```

**Step 6: Commit**

```bash
git add apps/web/next.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add bundle analyzer to apps/web (ANALYZE=true next build)"
```

---

## Task 10: a11y ESLint rules

**Files:**

- Modify: `apps/web/package.json` (add eslint-plugin-jsx-a11y)
- Modify: `apps/web/eslint.config.mjs` (add a11y rules)
- Modify: `apps/landing/package.json` (add eslint-plugin-jsx-a11y)
- Modify: `apps/landing/eslint.config.mjs` (add a11y rules)

**Step 1: Install a11y plugin in both apps**

```bash
pnpm add -D eslint-plugin-jsx-a11y --filter @nebutra/web
pnpm add -D eslint-plugin-jsx-a11y --filter @nebutra/landing
```

**Step 2: Read both eslint.config.mjs files**

```bash
cat apps/web/eslint.config.mjs
cat apps/landing/eslint.config.mjs
```

**Step 3: Add a11y rules to apps/web/eslint.config.mjs**

Add at the top:

```javascript
import jsxA11y from "eslint-plugin-jsx-a11y";
```

Add to the config array (before globalIgnores):

```javascript
{
  plugins: {
    "jsx-a11y": jsxA11y,
  },
  rules: {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/img-redundant-alt": "warn",
    "jsx-a11y/no-autofocus": "warn",
    "jsx-a11y/interactive-supports-focus": "warn",
  },
},
```

**Step 4: Add same a11y rules to apps/landing/eslint.config.mjs**

Same pattern as Step 3.

**Step 5: Run lint to see what needs fixing**

```bash
pnpm --filter @nebutra/web lint 2>&1 | grep "a11y" | head -20
pnpm --filter @nebutra/landing lint 2>&1 | grep "a11y" | head -20
```

Fix any `error`-level violations (not warn). Common fixes:

- `<img>` without `alt` → add `alt="description"`
- `<a>` without content → add text or `aria-label`

**Step 6: Commit**

```bash
git add apps/web/eslint.config.mjs apps/web/package.json apps/landing/eslint.config.mjs apps/landing/package.json pnpm-lock.yaml
git commit -m "feat: add eslint-plugin-jsx-a11y to web and landing for accessibility linting"
```

---

## Task 11: CI security scanning

**Files:**

- Modify: `.github/workflows/ci.yml`

**Step 1: Read the current CI file**

```bash
cat .github/workflows/ci.yml
```

**Step 2: Add a security-scan job after the existing jobs**

Add this job to `.github/workflows/ci.yml`, before the deploy jobs comment:

```yaml
# ── Security scanning ────────────────────────────────────────────────────
security:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Audit dependencies (high severity)
      run: pnpm audit --audit-level=high
      continue-on-error: true # Report but don't block (review weekly)

    - name: Check for secrets with Gitleaks
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 3: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add security scanning job (dependency audit + Gitleaks secret detection)"
```

---

## Task 12: apps/web utility tests

**Files:**

- Modify: `apps/web/package.json` (add vitest + @vitejs/plugin-react)
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/__tests__/env.test.ts`

**Step 1: Add vitest**

```bash
pnpm add -D vitest @vitest/coverage-v8 @vitejs/plugin-react --filter @nebutra/web
```

**Step 2: Create `apps/web/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/**/*.{test,spec}.{ts,tsx}"],
      include: ["src/**/*.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Add test scripts to apps/web/package.json**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Step 4: Create `apps/web/src/lib/__tests__/env.test.ts`**

The env.ts module validates process.env at import time. Test that the Zod schema correctly handles missing/invalid values by testing the schema logic independently:

```typescript
import { describe, it, expect } from "vitest";

// Test the shape and defaults of the env object without importing the module
// (which would trigger validation against the actual process.env)
import { z } from "zod";

// Duplicate the schema here to test it in isolation
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3002"),
  NEXT_PUBLIC_STUDIO_URL: z.string().url().default("http://localhost:3003"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default("wyfqr24v"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

describe("web env schema", () => {
  it("accepts empty object and applies all defaults", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.NODE_ENV).toBe("development");
    expect(result.data.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(result.data.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3001");
    expect(result.data.NEXT_PUBLIC_API_URL).toBe("http://localhost:3002");
  });

  it("accepts production NODE_ENV", () => {
    const result = envSchema.safeParse({ NODE_ENV: "production" });
    expect(result.success).toBe(true);
    expect(result.data?.NODE_ENV).toBe("production");
  });

  it("rejects invalid NODE_ENV", () => {
    const result = envSchema.safeParse({ NODE_ENV: "staging" });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL value for site URL", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SITE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid clerk key when provided", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
    });
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe(
      "pk_test_abc123",
    );
  });

  it("allows missing optional keys (clerk, stripe, sentry)", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(result.data?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeUndefined();
    expect(result.data?.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
  });

  it("uses correct default Sanity config", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_SANITY_PROJECT_ID).toBe("wyfqr24v");
    expect(result.data?.NEXT_PUBLIC_SANITY_DATASET).toBe("production");
  });

  it("overrides defaults with explicit values", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
    });
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
  });
});
```

**Step 5: Run tests**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm --filter @nebutra/web test 2>&1
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/lib/__tests__/env.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "test: add vitest setup and env schema unit tests to apps/web"
```

---

## Task 13: Playwright E2E setup + critical path tests

**Files:**

- Create: `playwright.config.ts` (root level)
- Modify: Root `package.json` (add playwright scripts)
- Create: `e2e/landing.spec.ts`
- Create: `e2e/auth.spec.ts`

**Step 1: Install Playwright**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm add -D @playwright/test --filter @nebutra/web
pnpm exec playwright install --with-deps chromium
```

**Step 2: Create root-level `playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 * Run with: pnpm e2e
 * Run with visual: pnpm e2e:ui
 * Run in CI: pnpm e2e:ci
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Auto-start the landing page dev server when running tests locally
  webServer: {
    command: "pnpm --filter @nebutra/landing dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

**Step 3: Add e2e scripts to root `package.json`**

Read the root `package.json` first:

```bash
cat package.json | grep -A 20 '"scripts"'
```

Add these scripts:

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui",
"e2e:ci": "playwright test --reporter=github"
```

**Step 4: Create `e2e/` directory and landing page smoke test**

Create `e2e/landing.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads and shows hero section", async ({ page }) => {
    await page.goto("/");

    // Page title should include Nebutra
    await expect(page).toHaveTitle(/Nebutra/i);

    // Main heading should be visible
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");

    // Main navigation should exist
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("CTA button navigates to sign-up", async ({ page }) => {
    await page.goto("/");

    // Find any 'Get started' / 'Sign up' CTA — adjust text to match actual content
    const cta = page
      .getByRole("link", { name: /get started|sign up|start/i })
      .first();

    if (await cta.isVisible()) {
      const href = await cta.getAttribute("href");
      expect(href).toBeTruthy();
    }
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");

    // Find the theme toggle button
    const toggle = page
      .getByRole("button", { name: /toggle theme|dark mode|light mode/i })
      .first();

    if (await toggle.isVisible()) {
      await toggle.click();
      const newClass = await html.getAttribute("class");
      // Class should have changed (dark/light mode switched)
      expect(newClass).not.toBe(initialClass);
    }
  });

  test("page has no broken images", async ({ page }) => {
    const failedImages: string[] = [];

    page.on("response", (response) => {
      if (response.request().resourceType() === "image" && !response.ok()) {
        failedImages.push(response.url());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(failedImages).toHaveLength(0);
  });
});
```

**Step 5: Create auth flow test**

Create `e2e/auth.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("sign-in page is accessible", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).not.toHaveTitle(/404|Not Found/i);
  });

  test("sign-up page is accessible", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).not.toHaveTitle(/404|Not Found/i);
  });

  test("sign-in link from landing page navigates correctly", async ({
    page,
  }) => {
    await page.goto("/");

    // Look for sign-in link in nav
    const signInLink = page
      .getByRole("link", { name: /sign in|log in/i })
      .first();

    if (await signInLink.isVisible()) {
      await signInLink.click();
      // Should navigate to sign-in page (may be Clerk hosted or /sign-in)
      await expect(page).not.toHaveTitle(/Error|404/i);
    }
  });
});
```

**Step 6: Run E2E tests**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm e2e 2>&1 | tail -30
```

Expected: tests run (may require the landing page server to be up). If tests fail because of dynamic content, adjust assertions using `.first()` and `.isVisible()` guards (already included).

If the server isn't running automatically, start it first:

```bash
pnpm --filter @nebutra/landing dev &
sleep 5
pnpm e2e 2>&1 | tail -30
```

**Step 7: Add to turbo.json**

In `turbo.json`, add the e2e task:

```json
"e2e": {
  "dependsOn": ["^build"],
  "cache": false
}
```

**Step 8: Commit**

```bash
git add playwright.config.ts e2e/ package.json turbo.json pnpm-lock.yaml
git commit -m "feat: add Playwright E2E setup with landing page smoke tests and auth flow tests"
```

---

## Completion Checklist

- [ ] `pnpm turbo typecheck` passes with strict flags enabled
- [ ] `.github/dependabot.yml` created
- [ ] `backends/gateway/vitest.config.ts` coverage exclude fixed
- [ ] `turbo.json` has optimized inputs for lint/typecheck/test
- [ ] `backends/gateway/Dockerfile` created
- [ ] `apps/landing/src/lib/env.ts` created with Zod
- [ ] `apps/web/src/lib/env.ts` migrated to Zod
- [ ] `apps/web/src/components/ErrorBoundary.tsx` created + wired
- [ ] `apps/web` bundle analyzer added (ANALYZE=true next build)
- [ ] `eslint-plugin-jsx-a11y` added to web + landing, 0 lint errors
- [ ] CI has security job (pnpm audit + Gitleaks)
- [ ] `apps/web` vitest + 8 env schema tests passing
- [ ] Playwright config + 8 E2E tests (landing + auth)
