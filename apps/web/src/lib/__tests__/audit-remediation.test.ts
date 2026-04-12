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
    const globals = readFromRepo("packages/theme/themes.css");
    expect(globals).toContain("--color-primary");
    expect(globals).toContain("--color-secondary");
  });

  it("uses @nebutra/brand as the primitive token source of truth", () => {
    const brandIndex = readFromRepo("packages/brand/src/index.ts");
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

    expect(hero).toMatch(/clamp\(/);
    expect(productDemo).toMatch(/lg:grid-cols-|lg:col-span-/);
  });

  it("uses LazyMotion wrappers in shared animation primitives", () => {
    const animateIn = readFromRepo("packages/ui/src/components/animate-in.tsx");

    expect(animateIn).toContain("LazyMotion");
    expect(animateIn).toContain("domAnimation");
    expect(animateIn).toContain("useReducedMotion");
  });

  it("provides a dashboard sidebar landmark in the app shell", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    expect(shell).toMatch(/<aside|role="navigation"|aria-label="Sidebar"/);
  });

  it("uses real dashboard IA routes with breadcrumb navigation", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const navModel = readFromRepo("apps/web/src/app/[locale]/providers/dashboard-nav.ts");

    expect(navModel).toContain('href: "/analytics"');
    expect(navModel).toContain('href: "/billing"');
    expect(navModel).toContain('href: "/tenants"');
    expect(navModel).toContain('href: "/audit"');
    expect(shell).toMatch(/aria-label="Breadcrumb"/);
    expect(shell).toMatch(/aria-current=/);
  });

  it("includes a workspace switcher and grouped dashboard navigation", () => {
    const shell = readFromRepo("apps/web/src/app/[locale]/providers/design-system-shell.tsx");
    const navModel = readFromRepo("apps/web/src/app/[locale]/providers/dashboard-nav.ts");

    expect(shell).toMatch(/aria-label="Workspace switcher"/);
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
    const pointer = readFromRepo("governance/ui-governance.current.json");
    const policy = readFromRepo("governance/ui-governance.v1.json");
    const schema = readFromRepo("governance/schemas/ui-governance.schema.json");

    expect(rootPackage).toContain("ui:validate-policy");
    expect(rootPackage).toContain("ui:verify-governance");
    expect(rootPackage).toContain("pnpm ui:verify-governance &&");
    expect(rootPackage).toContain("pnpm ui:validate-policy &&");
    expect(validateScript).toContain("UI governance policy schema validation passed");
    expect(sharedPolicyLoader).toContain("POLICY_SCHEMA_PATH");
    expect(sharedPolicyLoader).toContain("Ajv");
    expect(sharedPolicyLoader).toContain("loadUiGovernancePolicy");
    expect(script).toContain("UI governance verification passed");
    expect(script).toContain("loadUiGovernancePolicy");
    expect(pointer).toContain("policyFile");
    expect(policy).toContain('"$schema"');
    expect(policy).toContain('"policyVersion"');
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
