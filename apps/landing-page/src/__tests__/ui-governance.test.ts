import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LARGE_FEATURES } from "../components/landing/features/features-data";

const featureCardSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/features/FeatureBentoCard.tsx"),
  "utf8",
);
const featuresPageSource = readFileSync(
  path.join(process.cwd(), "src/app/[lang]/(marketing)/features/page.tsx"),
  "utf8",
);
const capabilityFolderShowcaseSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/features/CapabilityFolderShowcase.tsx"),
  "utf8",
);
const useCasesSectionSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/use-cases/UseCasesSection.tsx"),
  "utf8",
);
const productDemoSectionSource = readFileSync(
  path.join(process.cwd(), "src/components/landing/ProductDemoSection.tsx"),
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
const localeSwitcherSource = readFileSync(
  path.join(process.cwd(), "src/components/ui/locale-switcher.tsx"),
  "utf8",
);
const themeSwitcherSource = readFileSync(
  path.join(process.cwd(), "src/components/ui/theme-switcher.tsx"),
  "utf8",
);
const marketingHomePageSource = readFileSync(
  path.join(process.cwd(), "src/app/[lang]/(marketing)/page.tsx"),
  "utf8",
);

describe("landing UI governance", () => {
  it("keeps feature exploration CTAs semantic and localized", () => {
    expect(featureCardSource).toContain("<a");
    expect(featureCardSource).toContain("href={href}");
    expect(featuresPageSource).toContain("<CapabilityFolderShowcase");
    expect(capabilityFolderShowcaseSource).toContain("SECTION_COPY");
    expect(capabilityFolderShowcaseSource).toContain(
      'detail: { en: "View artifact", zh: "查看能力" }',
    );
    expect(capabilityFolderShowcaseSource).toContain("{SECTION_COPY.detail[localeKey]}");
    expect(featureCardSource).not.toContain(">Explore feature<");
    expect(featureCardSource).not.toContain("t: any");
    expect(featureCardSource).not.toContain("FeatureTranslator");
  });

  it("consumes the design-system artifact shift pattern for capability cards", () => {
    expect(capabilityFolderShowcaseSource).toContain('from "@nebutra/ui/patterns"');
    expect(capabilityFolderShowcaseSource).toContain('from "./feature-group-code-samples"');
    expect(capabilityFolderShowcaseSource).not.toContain('from "./feature-code-samples"');
    expect(capabilityFolderShowcaseSource).toContain("<ArtifactShiftCard");
    expect(capabilityFolderShowcaseSource).toContain("<ArtifactShiftCardPreview");
    expect(capabilityFolderShowcaseSource).toContain("<ArtifactShiftCardFooter>");
    expect(capabilityFolderShowcaseSource).not.toContain("function CapabilityArtifactPreview");
    expect(capabilityFolderShowcaseSource).not.toContain('data-taste="cult-shift-card"');
  });

  it("routes every large feature card to a canonical docs page", () => {
    expect(LARGE_FEATURES.length).toBeGreaterThan(0);

    for (const feature of LARGE_FEATURES) {
      expect(feature.href).toMatch(/^https:\/\/docs\.nebutra\.com\/[a-z0-9/-]+$/);
    }
  });

  it("keeps use-case demo mockups out of the mobile landing flow", () => {
    expect(useCasesSectionSource).toContain("hidden w-full");
    expect(useCasesSectionSource).toContain("lg:block");
    expect(useCasesSectionSource).toContain("order-1 lg:order-1");
    expect(useCasesSectionSource).not.toContain("scale-[0.55]");
  });

  it("does not render dense desktop demos in the mobile landing flow", () => {
    expect(productDemoSectionSource).toContain("hidden lg:col-span-7 lg:block");
    expect(productDemoSectionSource).not.toContain("h-[450px] md:h-[500px]");
    expect(heroMockupSource).toContain("h-[360px]");
    expect(heroMockupSource).toContain("sm:h-[440px]");
    expect(heroMockupSource).toContain("md:h-[520px]");
    expect(heroMockupSource).toContain("hidden w-full");
    expect(heroMockupSource).toContain("md:flex");
  });

  it("keeps mobile navigation and hero controls at touch-safe target sizes", () => {
    expect(heroInstallPillSource).toContain("size-11");
    expect(mobileDrawerSource).toContain("size-11");
    expect(localeSwitcherSource).toContain("min-h-11");
    expect(themeSwitcherSource).toContain("size-11");
    expect(newsletterFormSource).toContain("min-h-11");
    expect(newsletterFormSource).toContain('type="submit"');
  });

  it("keeps the marketing header visible until desktop navigation takes over", () => {
    expect(desktopNavSource).toContain("hidden lg:flex");
    expect(navbarSource).toContain("max-lg:bg-[var(--neutral-1)]/90");
    expect(navbarSource).toContain("max-lg:border-[var(--neutral-6)]");
    expect(navbarSource).toContain('className="flex items-center gap-1 lg:hidden"');
    expect(mobileDrawerSource).toContain('className="lg:hidden flex items-center"');
    expect(navbarSource).not.toContain('className="flex items-center gap-1 md:hidden"');
    expect(mobileDrawerSource).not.toContain('className="md:hidden flex items-center"');
  });

  it("uses mobile-specific section skeleton heights for lazy landing content", () => {
    expect(marketingHomePageSource).toContain("--section-skeleton-mobile-min-h");
    expect(marketingHomePageSource).toContain('mobileMinH="34rem"');
    expect(marketingHomePageSource).not.toContain(
      '<section aria-hidden className="w-full" style={{ minHeight: minH }} />',
    );
  });

  it("keeps the dense product demo desktop-only so mobile does not load hidden demo code", () => {
    const desktopDemoSource = readFileSync(
      path.join(process.cwd(), "src/components/landing/DesktopProductDemoSection.tsx"),
      "utf8",
    );

    expect(marketingHomePageSource).toContain("<DesktopProductDemoSection />");
    expect(desktopDemoSource).toContain("ssr: false");
    expect(desktopDemoSource).toContain('"hidden min-h-[48rem] w-full lg:block"');
    expect(desktopDemoSource).toContain('"(min-width: 1024px)"');
    expect(desktopDemoSource).toContain("return null");
  });
});
