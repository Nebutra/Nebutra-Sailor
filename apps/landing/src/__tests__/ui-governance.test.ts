import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const featuresPageSource = readFileSync(
  path.join(process.cwd(), "src/app/[lang]/(marketing)/features/page.tsx"),
  "utf8",
);
const capabilityFolderShowcaseSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/features/CapabilityFolderShowcase.tsx"),
  "utf8",
);
const capabilityCardSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/capability-cards/CapabilityCard.tsx"),
  "utf8",
);
const useCasesSectionSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/use-cases/UseCasesSection.tsx"),
  "utf8",
);
const aiConstellationMarqueeSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/AIConstellationMarquee.tsx"),
  "utf8",
);
const commandInstallBoxSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/CommandInstallBox.tsx"),
  "utf8",
);
const finalCtaSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/FinalCTA.tsx"),
  "utf8",
);
const designSystemSectionSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/DesignSystemSection.tsx"),
  "utf8",
);
const heroMockupSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/HeroMockupWindow.tsx"),
  "utf8",
);
const heroInstallPillSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/HeroInstallPill.tsx"),
  "utf8",
);
const navbarSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/Navbar.tsx"),
  "utf8",
);
const desktopNavSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/navbar/DesktopNav.tsx"),
  "utf8",
);
const mobileDrawerSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/navbar/MobileDrawer.tsx"),
  "utf8",
);
const newsletterFormSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/NewsletterForm.tsx"),
  "utf8",
);
const marketLocalePickerSource = readFileSync(
  path.join(process.cwd(), "src/components/ui/market-locale-picker.tsx"),
  "utf8",
);
/**
 * Touch-target classes live in the shared package, not the app-level binding —
 * the app files are three-line `createX(...)` wrappers. Asserting against the
 * wrapper passed only while a copy of the markup still existed in the app.
 */
const sharedPickerMarkupSource = readFileSync(
  path.join(process.cwd(), "../../packages/platform/i18n/src/market-locale-picker.tsx"),
  "utf8",
);
const sharedLocaleSwitcherSource = readFileSync(
  path.join(process.cwd(), "../../packages/platform/i18n/src/locale-switcher.tsx"),
  "utf8",
);
const themeSwitcherSource = readFileSync(
  path.join(process.cwd(), "src/components/ui/theme-switcher.tsx"),
  "utf8",
);
const marketingHomePageSource = readFileSync(
  // The Sailor home is the template's; nebutra.com leads with the Journal.
  path.join(process.cwd(), "src/app/[lang]/(marketing)/page.for-template.tsx"),
  "utf8",
);
const blogPageSource = readFileSync(
  path.join(process.cwd(), "src/app/[lang]/(marketing)/blog/page.for-template.tsx"),
  "utf8",
);
const blogMotionShowcaseSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/blog-motion-showcase.tsx"),
  "utf8",
);
const EXTERNAL_TASTE_PREFIX = ["cu", "lt-"].join("");

describe("landing UI governance", () => {
  it("keeps feature exploration CTAs semantic and localized", () => {
    expect(featuresPageSource).toContain("<CapabilityFolderShowcase");
    expect(capabilityFolderShowcaseSource).toContain("SECTION_COPY");
    expect(capabilityFolderShowcaseSource).toContain(
      'detail: { en: "View artifact", zh: "查看能力" }',
    );
    expect(capabilityFolderShowcaseSource).toContain("{SECTION_COPY.detail[localeKey]}");
  });

  it("consumes the design-system artifact shift pattern for capability cards", () => {
    expect(capabilityFolderShowcaseSource).toContain('from "@nebutra/ui/patterns"');
    expect(capabilityFolderShowcaseSource).toContain('from "./feature-group-code-samples"');
    expect(capabilityFolderShowcaseSource).not.toContain('from "./feature-code-samples"');
    expect(capabilityFolderShowcaseSource).toContain("<ArtifactShiftCard");
    expect(capabilityFolderShowcaseSource).toContain("<ArtifactShiftCardPreview");
    expect(capabilityFolderShowcaseSource).toContain("<ArtifactShiftCardFooter>");
    expect(capabilityFolderShowcaseSource).not.toContain("function CapabilityArtifactPreview");
    expect(capabilityFolderShowcaseSource).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("consumes design-system kinetic patterns for the live home capability and design-system surfaces", () => {
    expect(capabilityCardSource).toContain('from "@nebutra/ui/patterns"');
    expect(capabilityCardSource).toContain("<KineticFeatureCard");
    expect(capabilityCardSource).not.toContain(EXTERNAL_TASTE_PREFIX);

    expect(designSystemSectionSource).toContain('from "@nebutra/ui/patterns"');
    expect(designSystemSectionSource).toContain("<KineticStepRail");
    expect(designSystemSectionSource).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("consumes design-system kinetic patterns for use-case, AI provider, and command CTA surfaces", () => {
    expect(useCasesSectionSource).toContain('from "@nebutra/ui/patterns"');
    expect(useCasesSectionSource).toContain("<KineticMorphSurface");
    expect(useCasesSectionSource).not.toContain(EXTERNAL_TASTE_PREFIX);

    expect(aiConstellationMarqueeSource).toContain('from "@nebutra/ui/patterns"');
    expect(aiConstellationMarqueeSource).toContain("<KineticSignalMarquee");
    expect(aiConstellationMarqueeSource).not.toContain(EXTERNAL_TASTE_PREFIX);

    expect(commandInstallBoxSource).toContain('from "@nebutra/ui/patterns"');
    expect(commandInstallBoxSource).toContain("<KineticCommandBox");
    expect(commandInstallBoxSource).not.toContain("navigator.clipboard.writeText");
    expect(commandInstallBoxSource).not.toContain(EXTERNAL_TASTE_PREFIX);
    expect(finalCtaSource).toContain("<CommandInstallBox");
    expect(finalCtaSource).toContain("heroContent.command");
  });

  it("keeps use-case demo mockups out of the mobile landing flow", () => {
    expect(useCasesSectionSource).toContain("hidden w-full");
    expect(useCasesSectionSource).toContain("lg:block");
    expect(useCasesSectionSource).toContain("order-1");
    expect(useCasesSectionSource).toContain("lg:order-1");
    expect(useCasesSectionSource).not.toContain("scale-[0.55]");
  });

  it("does not render dense desktop demos in the mobile landing flow", () => {
    expect(heroMockupSource).toContain("h-[360px]");
    expect(heroMockupSource).toContain("sm:h-[440px]");
    expect(heroMockupSource).toContain("md:h-[520px]");
    expect(heroMockupSource).toContain("hidden w-full");
    expect(heroMockupSource).toContain("md:flex");
  });

  it("keeps mobile navigation and hero controls at touch-safe target sizes", () => {
    expect(heroInstallPillSource).toContain("size-11");
    expect(mobileDrawerSource).toContain("size-11");
    expect(sharedPickerMarkupSource).toContain("min-h-11");
    expect(sharedLocaleSwitcherSource).toContain("min-h-11");
    expect(themeSwitcherSource).toContain("size-11");
    expect(newsletterFormSource).toContain("min-h-11");
    expect(newsletterFormSource).toContain('type="submit"');
  });

  it("keeps the marketing header visible until desktop navigation takes over", () => {
    expect(desktopNavSource).toContain("hidden lg:flex");
    expect(navbarSource).toContain("max-lg:bg-background/90");
    expect(navbarSource).toContain("max-lg:border-border");
    expect(navbarSource).toContain('className="flex items-center gap-1 lg:hidden"');
    expect(mobileDrawerSource).toContain('className="lg:hidden flex items-center"');
    expect(navbarSource).not.toContain('className="flex items-center gap-1 md:hidden"');
    expect(mobileDrawerSource).not.toContain('className="md:hidden flex items-center"');
  });

  it("renders every template home section in place, not behind a streamed boundary", () => {
    // A completed <Suspense> boundary past ~12.8 KB of document is streamed out
    // of line (fallback in place, section in a <div hidden>), so readers that
    // run no JavaScript got skeletons. scripts/verify-landing-ssr.mjs checks
    // the built site; this keeps the template source from drifting back.
    expect(marketingHomePageSource).not.toMatch(
      /import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*"react"/,
    );
    expect(marketingHomePageSource).not.toContain("next/dynamic");
    expect(marketingHomePageSource).toContain("<CapabilityMatrixSection />");
    expect(marketingHomePageSource).toContain("<PricingSection />");
  });

  it("keeps the blog index on branded motion selectors instead of static hover only", () => {
    expect(blogPageSource).toContain("<BlogMotionHero");
    expect(blogPageSource).toContain("<LatestPostMotionRail");
    expect(blogMotionShowcaseSource).toContain("requestAnimationFrame");
    expect(blogMotionShowcaseSource).not.toContain(`from "${["framer", "motion"].join("-")}"`);
    // The copy menu is the shared DropdownMenu, controlled here; its trigger
    // carries aria-expanded itself, so the source no longer spells it out.
    expect(blogMotionShowcaseSource).toContain("<DropdownMenu open={open} onOpenChange={setOpen}>");
    expect(blogMotionShowcaseSource).toContain("copyPageAsMarkdown");
    expect(blogMotionShowcaseSource).toContain("setActivePostId(post.id)");
    expect(blogMotionShowcaseSource).toContain("motionDurationSec");
    expect(blogMotionShowcaseSource).not.toContain(EXTERNAL_TASTE_PREFIX);
  });

  it("does not mount the retired interactive product-demo section on the marketing home", () => {
    expect(marketingHomePageSource).not.toContain("DesktopProductDemoSection");
    expect(marketingHomePageSource).not.toContain("ProductDemoSection");
    expect(marketingHomePageSource).not.toContain('id="demo"');
  });
});

describe("market locale governance", () => {
  it("uses the country-plus-language market picker in Navbar, not the plain language switcher", () => {
    expect(navbarSource).toContain("MarketLocalePicker");
    expect(navbarSource).not.toContain("<LocaleSwitcher");
    expect(marketLocalePickerSource).toContain("createMarketLocalePicker");
  });
});
