import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFromRepo(relativePath: string) {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("UI/UX audit remediation invariants", () => {
  it("removes raw indigo Tailwind accents from key landing components", () => {
    const hero = readFromRepo("apps/landing-page/src/components/landing/HeroSection.tsx");
    const cta = readFromRepo("apps/landing-page/src/components/landing/FinalCTA.tsx");
    const navbar = readFromRepo("apps/landing-page/src/components/landing/Navbar.tsx");
    const features = readFromRepo("apps/landing-page/src/components/landing/FeatureCards.tsx");

    const critical = [hero, cta, navbar, features].join("\n");
    expect(critical).not.toMatch(/indigo-\d+/);
  });

  it("uses AnimateIn APIs instead of raw framer-motion primitives in hero surfaces", () => {
    const hero = readFromRepo("apps/landing-page/src/components/landing/HeroSection.tsx");
    const cta = readFromRepo("apps/landing-page/src/components/landing/FinalCTA.tsx");

    expect(hero).not.toMatch(/motion\./);
    expect(cta).not.toMatch(/motion\./);
    expect(hero).toContain("AnimateIn");
    expect(cta).toContain("AnimateIn");
  });

  it("avoids raw framer-motion usage in shared landing controls", () => {
    const navbar = readFromRepo("apps/landing-page/src/components/landing/Navbar.tsx");
    const themeSwitcher = readFromRepo("apps/landing-page/src/components/ui/theme-switcher.tsx");

    expect(navbar).not.toMatch(/motion\./);
    expect(themeSwitcher).not.toMatch(/motion\./);
  });

  it("aligns PWA theme color with Nebutra brand blue", () => {
    const manifest = readFromRepo("apps/landing-page/src/app/manifest.ts");
    expect(manifest).toContain('theme_color: "#0033FE"');
  });

  it("provides display-p3 brand colors with sRGB fallback", () => {
    const globals = readFromRepo("packages/design/theme/themes.css");
    expect(globals).toContain("--color-primary");
    expect(globals).toContain("--color-secondary");
  });

  it("uses @nebutra/brand as the primitive token source of truth", () => {
    const brandIndex = readFromRepo("packages/design/brand/src/index.ts");
    expect(brandIndex).toContain("colors");
    expect(brandIndex).toContain("brandMotion");
  });

  it("keeps app icons aligned with Nebutra blue-cyan gradient", () => {
    const appleIcon = readFromRepo("apps/landing-page/src/app/apple-icon.tsx");

    expect(appleIcon).toContain("#0033FE");
    expect(appleIcon).toContain("#0BF1C3");
    expect(appleIcon).not.toContain("#3B82F6");
    expect(appleIcon).not.toContain("#8B5CF6");
  });

  it("keeps Twitter OG dimensions and branding consistent with OpenGraph", () => {
    const twitterImage = readFromRepo("apps/landing-page/src/app/twitter-image.tsx");
    expect(twitterImage).toContain("width: 1200");
    expect(twitterImage).toContain("height: 630");
    expect(twitterImage).toMatch(/Nebutra Sailor|Sailor/);
  });

  it("enables lazy-loaded sections on the localized marketing page", () => {
    const marketingPage = readFromRepo("apps/landing-page/src/app/[lang]/(marketing)/page.tsx");
    expect(marketingPage).toMatch(/dynamic\(/);
  });

  it("defines page-level marketing metadata on localized home route", () => {
    const marketingPage = readFromRepo("apps/landing-page/src/app/[lang]/(marketing)/page.tsx");

    expect(marketingPage).toContain("export async function generateMetadata");
    expect(marketingPage).toContain('namespace: "metadata"');
  });

  it("uses fluid hero typography and responsive product grids", () => {
    const hero = readFromRepo("apps/landing-page/src/components/landing/HeroSection.tsx");
    const productDemo = readFromRepo(
      "apps/landing-page/src/components/landing/ProductDemoSection.tsx",
    );

    // The 2026 landing sweep (commit a6a32240) replaced clamp() with a
    // Tailwind responsive scale anchored to design-token tracking/leading
    // variables — same intent (fluid, breakpoint-aware), expressed through
    // tokens instead of clamp. Either form satisfies the UX invariant:
    // headline scales responsively + tracks token-driven type metrics.
    expect(hero).toMatch(/clamp\(|text-4xl[\s\S]*sm:text-5xl[\s\S]*md:text-6xl/);
    expect(hero).toMatch(/var\(--tracking-display\)|var\(--leading-display\)/);
    expect(productDemo).toMatch(/lg:grid-cols-|lg:col-span-/);
  });

  it("uses LazyMotion wrappers in shared animation primitives", () => {
    const animateIn = readFromRepo("packages/design/ui/src/components/animate-in.tsx");

    expect(animateIn).toContain("LazyMotion");
    expect(animateIn).toContain("domAnimation");
    expect(animateIn).toContain("useReducedMotion");
  });

  it("provides a dashboard sidebar landmark in the app shell", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    // The shell now delegates sidebar rendering to @nebutra/ui/patterns's
    // SidebarNav (refactor: a778b48a). The <nav aria-label="Sidebar">
    // landmark lives inside the SidebarNav primitive itself — what we assert
    // here is that the shell still imports SidebarNav as its sidebar provider,
    // which guarantees the landmark is mounted in production.
    expect(shell).toMatch(/SidebarNav/);
    expect(shell).toMatch(/from "@nebutra\/ui\/patterns"/);
  });

  it("exposes the global feedback dialog from the dashboard header", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");

    expect(shell).toContain("useFeedbackDialog");
    expect(shell).toContain("openFeedback");
    expect(shell).toContain('aria-label="Open feedback dialog"');
    expect(shell).toContain("Feedback");
  });

  it("uses governed brand logo assets instead of hardcoded app-shell wordmarks", () => {
    const brandAssets = readFromRepo("apps/web/src/components/brand/brand-assets.tsx");
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const publicChrome = readFromRepo("apps/web/src/components/navigation/public-page-chrome.tsx");
    const demoEmbed = readFromRepo("apps/web/src/app/[locale]/demo/embed/page.tsx");
    const themePlayground = readFromRepo(
      "apps/web/src/components/theme-playground/theme-playground-workbench.tsx",
    );

    expect(brandAssets).toContain('source: "packages/design/brand"');
    expect(brandAssets).toContain('src: "/brand/logo-color.svg"');
    expect(brandAssets).toContain('src: "/brand/logo-horizontal-en.svg"');
    expect(brandAssets).toContain("data-brand-source={webBrandAssets.source}");
    expect(shell).toContain("BrandLogo");
    expect(shell).toContain("webBrandLabels.homeLink");
    expect(shell).not.toContain("Nebutra Sailor");
    expect(shell).not.toContain('role="img"');
    expect(publicChrome).toContain("BrandLogo");
    expect(publicChrome).not.toContain('alt="Nebutra"');
    expect(demoEmbed).toContain("BrandLogo");
    expect(demoEmbed).not.toContain("Nebutra Sailor Dashboard");
    expect(themePlayground).toContain("Token governance workbench");
    expect(themePlayground).not.toContain("BrandLogo");
    expect(themePlayground).not.toContain("ThemeBrandMark");
    expect(themePlayground).not.toContain("function NebutraMark");
  });

  it("keeps subscription plan status out of the dashboard header chrome", () => {
    const layout = readFromRepo("apps/web/src/app/[locale]/(app)/layout.tsx");
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const planBadge = readFromRepo("apps/web/src/components/billing/plan-badge.tsx");

    expect(layout).toContain("planBadge={<PlanBadge />}");
    expect(layout).not.toMatch(/<DesignSystemShell[\s\S]*planBadge=\{planBadge\}/);
    expect(shell).not.toContain("planBadge");
    expect(planBadge).toContain("subscription status for billing/account surfaces");
    expect(planBadge).not.toContain("shell header");
  });

  it("keeps the dashboard overview decision-led instead of welcome-page centered", () => {
    const dashboard = readFromRepo("apps/web/src/app/[locale]/(app)/workspace/page.tsx");
    const skeletons = readFromRepo("apps/web/src/app/[locale]/(app)/_dashboard-skeletons.tsx");
    const translations = readFromRepo("packages/platform/i18n/locales/en.json");

    expect(dashboard).toContain("CommandCenter");
    expect(dashboard).toContain("max-w-[1760px]");
    expect(dashboard).toContain("if (!summary?.day) return null");
    expect(dashboard).toContain("if (!tenantId) return null");
    expect(dashboard).toContain("snapshotMeta");
    expect(dashboard).toContain("details.activeUsers");
    expect(dashboard).toContain("meta.latestDay");
    expect(skeletons).toContain("max-w-5xl");
    expect(translations).toContain('"commandCenter"');
    expect(dashboard).not.toContain("Atmospheric brand glow");
    expect(dashboard).not.toContain("max-w-2xl flex-col items-center");
    expect(dashboard).not.toContain("DashboardHint");
    expect(dashboard).not.toContain("GettingStarted");
    expect(dashboard).not.toContain("CommandSurfaceButton");
    expect(dashboard).not.toContain("ModePills");
    expect(dashboard).not.toContain("demo_org");
  });

  it("keeps onboarding scaffolding off the dashboard overview", () => {
    const dashboard = readFromRepo("apps/web/src/app/[locale]/(app)/workspace/page.tsx");
    const skeletons = readFromRepo("apps/web/src/app/[locale]/(app)/_dashboard-skeletons.tsx");

    expect(dashboard).not.toContain("GettingStarted");
    expect(dashboard).not.toContain("OnboardingSkeleton");
    expect(skeletons).not.toContain("OnboardingSkeleton");
    expect(skeletons).not.toContain("space-y-px overflow-hidden");
  });

  it("uses compact dashboard metric metadata instead of oversized nested cards", () => {
    const dashboard = readFromRepo("apps/web/src/app/[locale]/(app)/workspace/page.tsx");
    const translations = readFromRepo("packages/platform/i18n/locales/en.json");

    expect(dashboard).toContain("snapshotMeta");
    expect(dashboard).toContain("meta.snapshot");
    expect(dashboard).toContain("meta.tenant");
    expect(dashboard).not.toContain("type MetricMeta");
    expect(dashboard).not.toContain("dailyMeta");
    expect(dashboard).not.toContain("<dl");
    expect(dashboard).toContain("text-xl font-semibold");
    expect(dashboard).toContain("xl:grid-cols-4");
    expect(dashboard).not.toContain("text-3xl font-semibold tabular-nums");
    expect(dashboard).not.toContain("2xl:grid-cols-4");
    expect(translations).toContain('"snapshot": "Snapshot"');
    expect(translations).toContain('"cadence": "Cadence"');
    expect(translations).toContain('"tenant": "Tenant"');
  });

  it("keeps the authenticated dashboard shell high-density instead of touch-first oversized", () => {
    const appShell = readFromRepo("packages/design/ui/src/layout/app-shell.tsx");
    const sidebarNav = readFromRepo("packages/design/ui/src/patterns/sidebar-nav/sidebar-nav.tsx");
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const workspaceSwitcher = readFromRepo(
      "packages/design/ui/src/patterns/workspace-switcher.tsx",
    );

    expect(appShell).toContain("const DEFAULT_HEADER_HEIGHT = 48");
    expect(appShell).toContain("const DEFAULT_SIDEBAR_WIDTH = 224");
    expect(appShell).toContain("const DEFAULT_COLLAPSED_WIDTH = 52");
    expect(appShell).toContain("max-w-none px-3 py-4");
    expect(sidebarNav).toContain("px-2.5 py-1.5 text-[13px]");
    expect(sidebarNav).toContain(
      'const ITEM_COLLAPSED_CLASSES = "justify-center px-0 size-8 mx-auto"',
    );
    expect(workspaceSwitcher).toContain("px-2 py-1 text-left");
    expect(shell).toContain('className={collapsed ? "size-7" : "h-6 w-[8.5rem]"}');
    expect(shell).not.toContain("Workspace: {currentWorkspaceLabel}");
  });

  it("uses real dashboard IA routes with breadcrumb navigation", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const navModel = readFromRepo("apps/web/src/app/[locale]/providers/dashboard-nav.ts");

    expect(navModel).toContain('href: "/billing"');
    expect(navModel).toContain('href: "/tenants"');
    expect(navModel).toContain('href: "/audit"');
    expect(navModel).toContain('import { routing } from "@nebutra/i18n/routing"');
    expect(navModel).toContain("export function stripLocalePrefix");
    expect(navModel).toContain("const normalizedPathname = stripLocalePrefix(pathname)");
    expect(shell).toMatch(/aria-label="Breadcrumb"/);
    expect(shell).toMatch(/aria-current=/);
    expect(shell).toContain("breadcrumbs.length > 1");
    expect(shell).not.toContain("DASHBOARD_NAV_ITEMS.slice");
    expect(shell).not.toContain("Workspace</p>");
  });

  it("includes a workspace switcher and grouped dashboard navigation", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const navModel = readFromRepo("apps/web/src/app/[locale]/providers/dashboard-nav.ts");

    // The aria-label="Workspace switcher" inline JSX was replaced by the
    // WorkspaceSwitcher primitive from @nebutra/ui/patterns (refactor:
    // a778b48a) — which renders its own aria-label="Switch workspace"
    // trigger. Asserting on the import ensures the switcher is mounted.
    expect(shell).toMatch(/WorkspaceSwitcher/);
    expect(shell).toMatch(/from "@nebutra\/ui\/patterns"/);
    expect(shell).toContain("./dashboard-nav");
    expect(navModel).toContain("Product");
    expect(navModel).toContain("Operations");
  });

  it("enables View Transition navigation in dashboard shell links", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const link = readFromRepo("apps/web/src/components/navigation/view-transition-link.tsx");
    const globals = readFromRepo("apps/web/src/app/globals.css");

    expect(shell).toContain("ViewTransitionLink");
    expect(link).toContain("startViewTransition");
    expect(globals).toContain("::view-transition-old(dashboard-content)");
    expect(globals).toContain("view-transition-name: dashboard-content");
  });

  it("adds container-query based responsive behavior for key landing sections", () => {
    const globals = readFromRepo("apps/landing-page/src/app/globals.css");
    const featureCards = readFromRepo("apps/landing-page/src/components/landing/FeatureCards.tsx");

    expect(globals).toContain("@container product-demo");
    expect(globals).toContain("@container feature-cards");
    expect(globals).toContain("product-demo-cq");
    expect(globals).toContain("product-demo-grid");
    expect(featureCards).toContain("feature-cards-cq");
    expect(featureCards).toContain("feature-cards-grid");
  });

  it("contains a token-sync verification script for CI guardrails", () => {
    const rootPackage = readFromRepo("package.json");
    const script = readFromRepo("scripts/verify-brand-token-sync.ts");

    expect(rootPackage).toContain("brand:verify-tokens");
    expect(rootPackage).toContain("pnpm brand:verify-tokens &&");
    expect(script).toContain("Token sync verification passed");
    expect(script).toContain("@nebutra/brand");
  });

  it("enforces UI governance checks in the root build pipeline", () => {
    const rootPackage = readFromRepo("package.json");
    const validateScript = readFromRepo("scripts/validate-ui-governance-policy.ts");
    const sharedPolicyLoader = readFromRepo("scripts/lib/ui-governance-policy.ts");
    const script = readFromRepo("scripts/verify-ui-governance.ts");
    const pointer = readFromRepo("tests/architecture/governance/ui-governance.current.json");
    const policy = readFromRepo("tests/architecture/governance/ui-governance.policy.json");
    const schema = readFromRepo("tests/architecture/governance/schemas/ui-governance.schema.json");

    expect(rootPackage).toContain("ui:validate-policy");
    expect(rootPackage).toContain("ui:verify-governance");
    expect(rootPackage).toContain("pnpm ui:verify-governance &&");
    expect(rootPackage).toContain("pnpm ui:validate-policy &&");
    expect(validateScript).toContain("UI governance policy schema validation passed");
    expect(sharedPolicyLoader).toContain("POLICY_SCHEMA_PATH");
    expect(sharedPolicyLoader).toContain("Ajv");
    expect(sharedPolicyLoader).toContain("loadUiGovernancePolicy");
    expect(sharedPolicyLoader).toContain("canonical policy filename");
    expect(script).toContain("UI governance verification passed");
    expect(script).toContain("loadUiGovernancePolicy");
    expect(pointer).toContain("policyFile");
    expect(pointer).toContain("ui-governance.policy.json");
    expect(policy).toContain('"$schema"');
    expect(policy).toContain('"schemaVersion"');
    expect(policy).toContain('"policyVersion"');
    expect(policy).not.toContain(".v1");
    expect(policy).not.toContain(".v2");
    expect(policy).toContain('"rawTailwindColorBudgets"');
    expect(policy).toContain('"componentTierCoverage"');
    expect(policy).toContain('"dependencyBoundaries"');
    expect(schema).toContain('"Nebutra UI Governance Policy"');
    expect(schema).toContain('"rawTailwindColorBudgets"');
  });

  it("uses source-level ui path mapping and explicit runtime env mapping", () => {
    const webTsConfig = readFromRepo("apps/web/tsconfig.json");
    const webEnv = readFromRepo("apps/web/src/lib/env.ts");

    expect(webTsConfig).toContain('"@nebutra/ui/*"');
    expect(webEnv).toContain("experimental__runtimeEnv: {");
    expect(webEnv).toContain("NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL");
  });

  it("uses parameterized tenant binding for ClickHouse dashboard queries", () => {
    const warehouse = readFromRepo("apps/web/src/lib/warehouse/gold.ts");

    expect(warehouse).toContain("param_tenant_id");
    expect(warehouse).toContain("WHERE tenant_id = {tenant_id:String}");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: intentionally checking for unsafe SQL template
    expect(warehouse).not.toContain("WHERE tenant_id = '${tenantId}'");
  });

  it("includes skip-to-content links in both app layouts", () => {
    const landingLayout = readFromRepo("apps/landing-page/src/app/[lang]/layout.tsx");
    const webLayout = readFromRepo("apps/web/src/app/[locale]/layout.tsx");

    expect(landingLayout).toMatch(/main-content|skip/i);
    expect(webLayout).toMatch(/main-content|skip/i);
  });

  it("uses safe JSON-LD script injection without dangerouslySetInnerHTML", () => {
    const landingLayout = readFromRepo("apps/landing-page/src/app/[lang]/layout.tsx");

    expect(landingLayout).toContain("toSafeJsonLd");
    expect(landingLayout).toContain('type="application/ld+json"');
    expect(landingLayout).not.toContain("dangerouslySetInnerHTML");
  });

  it("about page exists in marketing route group", () => {
    const aboutPage = readFromRepo("apps/landing-page/src/app/[lang]/(marketing)/about/page.tsx");

    // Page moved from (legal) to (marketing) route group
    expect(aboutPage).toBeTruthy();
    expect(aboutPage).toContain("export default");
  });

  it("removes indigo accents and autofocus props from auth/onboarding surfaces", () => {
    const signIn = readFromRepo("apps/web/src/components/auth/sign-in-form.tsx");
    const signUp = readFromRepo("apps/web/src/components/auth/sign-up-form.tsx");
    const authBanner = readFromRepo("apps/web/src/components/auth/auth-banner.tsx");
    const workspace = readFromRepo("apps/web/src/components/onboarding/create-workspace-step.tsx");

    const authSurface = [signIn, signUp, authBanner].join("\n");
    expect(authSurface).not.toMatch(/indigo-\d+/);
    expect(workspace).not.toContain("autoFocus");
    expect(signUp).not.toContain("autoFocus");
  });
});
