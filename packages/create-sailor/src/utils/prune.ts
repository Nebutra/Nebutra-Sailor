import fs from "node:fs";
import path from "node:path";
import type { NebutraConfig } from "./config.js";
import type { WaveFeatureToggles } from "./wave-features.js";

function walkDir(dir: string, callback: (filepath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walkDir(p, callback);
    } else {
      callback(p);
    }
  }
}

export async function pruneTemplate(targetDir: string, config: NebutraConfig) {
  const rootPkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(rootPkgPath)) return;

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));

  // 1. ORM Deep Clean
  if (config.orm !== "prisma") {
    const dbPkgDir = path.join(targetDir, "packages", "db");
    if (fs.existsSync(dbPkgDir)) {
      const prismaDir = path.join(dbPkgDir, "prisma");
      if (fs.existsSync(prismaDir)) fs.rmSync(prismaDir, { recursive: true, force: true });

      const dbPkgPath = path.join(dbPkgDir, "package.json");
      if (fs.existsSync(dbPkgPath)) {
        const dbPkg = JSON.parse(fs.readFileSync(dbPkgPath, "utf8"));
        if (dbPkg.dependencies) {
          delete dbPkg.dependencies["@prisma/client"];
        }
        if (dbPkg.devDependencies) {
          delete dbPkg.devDependencies.prisma;
        }
        fs.writeFileSync(dbPkgPath, JSON.stringify(dbPkg, null, 2) + "\n");
      }

      const dbIndexTs = path.join(dbPkgDir, "src", "index.ts");
      if (fs.existsSync(dbIndexTs)) {
        const mockDbContent = `
export const prisma = {} as any;
export const db = {} as any;
export type PrismaClient = any;
export type Prisma = any;
export const withOrgContext = (cb: any) => cb(prisma);
export const withAdminContext = (cb: any) => cb(prisma);

// Mock all possible schema types to let consumers compile
export type Organization = any;
export type User = any;
export type OrganizationMember = any;
export type Plan = any;
export type Role = any;
export type Content = any;
export type ContentTranslation = any;
export type ContentEmbedding = any;
export type ContentStatus = any;
export type Product = any;
export type Order = any;
export type OrderItem = any;
export type Integration = any;
export type OrderStatus = any;
export type IntegrationType = any;
export type Wallet = any;
export type Nft = any;
export type NftStatus = any;
export type UserActivity = any;
export type TenantUsage = any;
export type AIRequest = any;
export type AIProvider = any;
export type AIRequestType = any;
export type UserPreference = any;
export type Recommendation = any;
export type FeatureFlag = any;
export type FeatureFlagOverride = any;
export type FeatureFlagType = any;
export type WebhookEvent = any;
export type AuditLog = any;
export type AuditAction = any;
export type Subscription = any;
export type UsageRecord = any;
export type UsageAggregate = any;
export type UsageLedgerEntry = any;
export type UsageType = any;
export type UsageLedgerSource = any;
`;
        fs.writeFileSync(dbIndexTs, mockDbContent);
      }
    }

    if (rootPkg.scripts?.postinstall) {
      rootPkg.scripts.postinstall = rootPkg.scripts.postinstall.replace(
        /prisma generate/g,
        'echo "ORM Disabled"',
      );
    }
  }

  // 2. i18n Deep Flattening
  if (!config.i18n) {
    const appsDir = path.join(targetDir, "apps");
    if (fs.existsSync(appsDir)) {
      const apps = fs.readdirSync(appsDir);
      for (const app of apps) {
        const appDir = path.join(appsDir, app);
        if (!fs.statSync(appDir).isDirectory()) continue;

        const srcAppDir = path.join(appDir, "src", "app");
        if (!fs.existsSync(srcAppDir)) continue;

        ["[lang]", "[locale]"].forEach((localeDirName) => {
          const localePath = path.join(srcAppDir, localeDirName);
          if (fs.existsSync(localePath)) {
            const items = fs.readdirSync(localePath);
            for (const item of items) {
              fs.renameSync(path.join(localePath, item), path.join(srcAppDir, item));
            }
            fs.rmdirSync(localePath);
          }
        });

        ["src/middleware.ts", "middleware.ts"].forEach((mw) => {
          const mwPath = path.join(appDir, mw);
          if (fs.existsSync(mwPath)) fs.rmSync(mwPath);
        });

        const libDir = path.join(appDir, "src", "lib");
        if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

        const mockI18nPath = path.join(libDir, "mock-i18n.ts");
        const mockI18nContent = `
import React from 'react';
export function useTranslations(namespace?: string): any { return (key: string) => key; }
export function useLocale() { return 'en'; }
export const NextIntlClientProvider = ({ children, ...props }: any) => React.createElement(React.Fragment, null, children);
export async function getTranslations(...args: any[]) { return (key: string) => key; }
export async function getMessages(...args: any[]) { return {}; }
export function setRequestLocale(locale: string) {}
export function hasLocale(locales: string[], locale: string) { return true; }
export function getRequestConfig(cb: any) { return cb; }
export const routing = { locales: ['en'], defaultLocale: 'en' };
export const Link = ({ children, href, ...props }: any) => React.createElement('a', { href, ...props }, children);
export const redirect = (url: string, ...args: any[]) => {};
export const usePathname = () => '/';
export const useRouter = () => ({ push: (...args: any[]) => {}, replace: (...args: any[]) => {} });
export default function createMiddleware(...args: any[]) { return (req: any) => req; }
export function createNavigation(...args: any[]) { return { Link, redirect, usePathname, useRouter, getPathname: () => '/' }; }
export function defineRouting<T>(config: T): T { return config; }
`;
        fs.writeFileSync(mockI18nPath, mockI18nContent);

        const mockI18nDeclaration = path.join(libDir, "mock-i18n.d.ts");
        fs.writeFileSync(
          mockI18nDeclaration,
          `declare module '@/lib/mock-i18n' {
    export function useTranslations(namespace?: string): any;
    export function useLocale(): string;
    export const NextIntlClientProvider: React.FC<any>;
    export function getTranslations(...args: any[]): Promise<(key: string) => string>;
    export function getMessages(...args: any[]): Promise<any>;
    export function setRequestLocale(locale: string): void;
    export function hasLocale(locales: string[], locale: string): boolean;
    export function getRequestConfig(cb: any): any;
    export const routing: { locales: string[], defaultLocale: string };
    export const Link: React.FC<any>;
    export function redirect(url: string, ...args: any[]): void;
    export function usePathname(): string;
    export function useRouter(): any;
    export default function createMiddleware(...args: any[]): any;
    export function createNavigation(...args: any[]): any;
    export function defineRouting<T>(config: T): T;
}
`,
        );

        // Add index.ts to export the mock module easily
        fs.writeFileSync(
          path.join(libDir, "mock-i18n-index.ts"),
          `
export * from './mock-i18n';
export { default } from './mock-i18n';
        `,
        );

        // We also need to map next-intl to this mock in the user's project to stop TS complaints
        // Add paths to tsconfig.json
        const tsConfigPath = path.join(appDir, "tsconfig.json");
        if (fs.existsSync(tsConfigPath)) {
          try {
            const tsConfigStr = fs.readFileSync(tsConfigPath, "utf8");
            // Use a simple regex replace to inject the path mapping if compilerOptions.paths exists
            if (tsConfigStr.includes('"paths": {')) {
              const replaced = tsConfigStr.replace(
                /"paths":\s*\{/,
                '"paths": {\n      "next-intl": ["./src/lib/mock-i18n"],\n      "next-intl/*": ["./src/lib/mock-i18n"],',
              );
              fs.writeFileSync(tsConfigPath, replaced);
            }
          } catch {
            // Ignore parse errors
          }
        }

        const srcDir = path.join(appDir, "src");
        if (fs.existsSync(srcDir)) {
          walkDir(srcDir, (filepath) => {
            if (!filepath.endsWith(".ts") && !filepath.endsWith(".tsx")) return;
            let content = fs.readFileSync(filepath, "utf8");
            let edited = false;

            // Fix layout import after flattening: "../providers" becomes "./providers"
            if (filepath.endsWith("src/app/layout.tsx") && content.includes("../providers")) {
              content = content.replace(/from\s+['"]\.\.\/providers['"]/g, "from './providers'");
              edited = true;
            }

            // Rewrite generic params promises
            content = content.replace(
              /params:\s*Promise<\{[^}]*(lang|locale)[^}]*\}>/g,
              "params: any",
            );
            content = content.replace(
              /\(\{\s*params\s*\}\s*:\s*\{\s*params:\s*any\s*\}\)/g,
              "({ params }: any)",
            );

            // Remove lingering locale any types that might fail strict mode
            if (content.match(/locale\s*:\s*any/)) {
              content = content.replace(/locale\s*:\s*any/g, "locale: string");
              edited = true;
            }
            if (content.match(/lang\s*:\s*any/)) {
              content = content.replace(/lang\s*:\s*any/g, "lang: string");
              edited = true;
            }
            if (content.match(/requestLocale\s*:\s*any/)) {
              content = content.replace(/requestLocale\s*:\s*any/g, "requestLocale: string");
              edited = true;
            }
            if (content.match(/\(locale\s*=\s*(.*)\)/)) {
              content = content.replace(/\(locale\s*=\s*(.*)\)/g, "() ");
              edited = true;
            }
            if (content.match(/export\s+default\s+async\s+function\s+LangLayout/)) {
              content = content.replace(
                /export\s+default\s+async\s+function\s+LangLayout\s*\(\s*\{\s*children\s*,\s*params\s*\}\s*:\s*LangLayoutProps\s*\)/g,
                "export default async function LangLayout({ children }: { children: React.ReactNode })",
              );
              edited = true;
            }

            if (
              filepath.endsWith("src/app/layout.tsx") ||
              filepath.endsWith("src/app/sitemap.ts") ||
              filepath.endsWith("src/app/robots.ts") ||
              filepath.endsWith("src/components/ui/locale-switcher.tsx") ||
              filepath.endsWith("src/app/(marketing)/blog/[slug]/page.tsx")
            ) {
              content = content.replace(
                /const\s+\{\s*lang\s*\}\s*=\s*(await\s+)?params;?/g,
                'const lang = "en";',
              );
              content = content.replace(
                /const\s+\{\s*locale\s*\}\s*=\s*(await\s+)?params;?/g,
                'const locale = "en";',
              );
              content = content.replace(
                /const\s+locale\s*=\s*lang\s+as\s+Locale;?/g,
                'const locale = "en";',
              );

              // In sitemap and locale-switcher, there are functions mapping over locales with parameters (l)
              content = content.replace(/\(l\)\s*=>/g, "(l: any) =>");
              edited = true;
            }

            if (filepath.endsWith("src/i18n/request.ts")) {
              content = content.replace(
                /async\s*\(\{\s*requestLocale\s*\}\)/g,
                "async ({ requestLocale }: any)",
              );
              edited = true;
            }

            if (content.match(/locale\s*:/) || content.match(/lang\s*:/)) {
              edited = true;
            }

            if (edited) fs.writeFileSync(filepath, content);
          });
        }

        const appPkgPath = path.join(appDir, "package.json");
        if (fs.existsSync(appPkgPath)) {
          const appPkg = JSON.parse(fs.readFileSync(appPkgPath, "utf8"));
          if (appPkg.dependencies) delete appPkg.dependencies["next-intl"];
          fs.writeFileSync(appPkgPath, JSON.stringify(appPkg, null, 2) + "\n");
        }
      }
    }
  }

  // Save the pruned root package.json back
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
}

/**
 * Idempotent silent remove. Best-effort: any error (incl. ENOENT) is
 * swallowed so prune passes can be re-run safely without throwing on
 * already-removed paths.
 */
function safeRm(p: string): void {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore — best-effort cleanup
  }
}

/**
 * Remove the `@nebutra/<name>` dependency entry from a workspace
 * `package.json` if present. Re-serialises with 2-space indentation and a
 * trailing newline (matching this repo's Prettier convention). No-op if
 * the file or dep is missing — keeps callers idempotent.
 */
function removeDependencyFromPkg(pkgPath: string, depName: string): void {
  if (!fs.existsSync(pkgPath)) return;
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    // Malformed package.json — leave it alone.
    return;
  }

  let changed = false;
  if (pkg.dependencies && depName in pkg.dependencies) {
    const { [depName]: _removed, ...rest } = pkg.dependencies;
    pkg = { ...pkg, dependencies: rest };
    changed = true;
  }
  if (pkg.devDependencies && depName in pkg.devDependencies) {
    const { [depName]: _removed, ...rest } = pkg.devDependencies;
    pkg = { ...pkg, devDependencies: rest };
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}

/**
 * Prune wave 3-5 cross-cutting feature surfaces from a scaffolded project.
 *
 * Each toggle, when `false`, removes the corresponding files / directories
 * in the scaffolded `targetDir`. Silent-skip semantics: paths that don't
 * exist (e.g. because the upstream template moved them, or the user pruned
 * a parent earlier in the chain) are skipped without error.
 *
 * Order matches the documented spec table: cronJobs → auditLog → apiKeys
 * → webhooks → commandPalette → cookieConsent → legalPages →
 * chinaCompliance. The function is **idempotent** — running it twice is
 * the same as running it once.
 *
 * Caveat: `commandPalette=false` is a best-effort prune. The mount
 * provider file is removed but integrators may still need to manually
 * un-import it from `apps/web/src/app/[locale]/layout.tsx` if their
 * downstream layout grew custom references. The cleanup is documented in
 * `.sailor/next-steps.md` via the welcome page generator.
 *
 * Immutability: returns void. Does not mutate the toggles object.
 */
export function pruneWaveFeatures(targetDir: string, toggles: WaveFeatureToggles): void {
  // 1. cronJobs
  if (!toggles.cronJobs) {
    safeRm(path.join(targetDir, "apps/web/src/app/api/cron"));
    safeRm(path.join(targetDir, "packages/queue/src/scheduled"));
  }

  // 2. auditLog
  if (!toggles.auditLog) {
    safeRm(path.join(targetDir, "apps/web/src/app/[locale]/(app)/settings/audit-log"));
    safeRm(path.join(targetDir, "apps/web/src/app/api/audit-logs"));
    safeRm(path.join(targetDir, "apps/web/src/components/audit"));
  }

  // 3. apiKeys
  if (!toggles.apiKeys) {
    safeRm(path.join(targetDir, "apps/web/src/app/[locale]/(app)/settings/api-keys"));
    safeRm(path.join(targetDir, "apps/web/src/app/api/api-keys"));
    safeRm(path.join(targetDir, "apps/web/src/components/api-keys"));
  }

  // 4. webhooks (UI surface — distinct from the --webhooks provider flag)
  if (!toggles.webhooks) {
    safeRm(path.join(targetDir, "apps/web/src/app/[locale]/(app)/settings/webhooks"));
    safeRm(path.join(targetDir, "apps/web/src/app/api/webhooks"));
    safeRm(path.join(targetDir, "apps/web/src/components/webhooks"));
    safeRm(path.join(targetDir, "packages/webhooks"));
  }

  // 5. commandPalette
  if (!toggles.commandPalette) {
    safeRm(path.join(targetDir, "apps/web/src/components/command-palette"));
    safeRm(path.join(targetDir, "apps/web/src/app/[locale]/providers/command-palette-mount.tsx"));
    // NOTE: layout.tsx may still import the mount component. We do not
    // mutate it here — integrators should run `pnpm typecheck` and remove
    // any stale imports manually. Documented in welcome next-steps.md.
  }

  // 6. cookieConsent
  if (!toggles.cookieConsent) {
    safeRm(path.join(targetDir, "apps/landing-page/src/components/cookie-consent-banner.tsx"));
    safeRm(
      path.join(
        targetDir,
        "apps/landing-page/src/components/__tests__/cookie-consent-banner.test.tsx",
      ),
    );
    safeRm(path.join(targetDir, "apps/landing-page/src/lib/cookie-consent.ts"));
    safeRm(path.join(targetDir, "apps/landing-page/src/lib/__tests__/cookie-consent.test.ts"));
    safeRm(path.join(targetDir, "apps/web/src/app/api/cookie-consent"));
  }

  // 7. legalPages
  if (!toggles.legalPages) {
    safeRm(path.join(targetDir, "apps/landing-page/src/app/[lang]/(legal)/legal"));
    safeRm(path.join(targetDir, "apps/landing-page/src/lib/legal-documents.ts"));
    safeRm(path.join(targetDir, "apps/landing-page/src/lib/__tests__/legal-documents.test.ts"));
  }

  // 8. chinaCompliance — also removes the dep from apps/web/package.json
  if (!toggles.chinaCompliance) {
    safeRm(path.join(targetDir, "packages/china-compliance"));
    safeRm(path.join(targetDir, "apps/landing-page/src/components/icp-footer.tsx"));
    safeRm(path.join(targetDir, "apps/landing-page/src/components/__tests__/icp-footer.test.tsx"));
    safeRm(path.join(targetDir, "apps/web/src/components/auth/wechat-login-button.tsx"));
    safeRm(
      path.join(targetDir, "apps/web/src/components/auth/__tests__/wechat-login-button.test.tsx"),
    );
    removeDependencyFromPkg(
      path.join(targetDir, "apps/web/package.json"),
      "@nebutra/china-compliance",
    );
  }
}
