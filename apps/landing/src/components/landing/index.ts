/**
 * Landing Page Section Components
 */

export { AIConstellationMarquee } from "./AIConstellationMarquee";
export { BlogShowcase, type BlogShowcaseProps } from "./BlogShowcase";
export { BlogCtaBlock, type BlogCtaBlockItem, type BlogCtaBlockProps } from "./blog-cta-block";
export { CapabilityMatrixSection } from "./CapabilityMatrixSection";
export { DesignSystemSection } from "./DesignSystemSection";
// Legacy components (kept for backwards compat)
export { FeatureCards } from "./FeatureCards";
export { FinalCTA } from "./FinalCTA";
export { FooterMinimal } from "./FooterMinimal";
export { GlobalEdgeMap } from "./GlobalEdgeMap";
export { HeroMockupWindow } from "./HeroMockupWindow";
export { HeroSection } from "./HeroSection";
export { InteractiveChangelog } from "./InteractiveChangelog";
export { LogoStrip } from "./LogoStrip";
export { MonorepoFileTree } from "./MonorepoFileTree";
export { Navbar } from "./Navbar";
export { NewsletterForm } from "./NewsletterForm";
export { PricingHintSection } from "./PricingHintSection";
export { PricingSection } from "./PricingSection";
export { UseCasesSection } from "./use-cases";
export { VelocitySignalStrip } from "./VelocitySignalStrip";
export { WorkflowSection } from "./WorkflowSection";

export const LANDING_SECTIONS = [
  "Navbar",
  "HeroSection",
  "LogoStrip",
  "HeroMockupWindow",
  "AIConstellationMarquee",
  "CapabilityMatrixSection",
  "DesignSystemSection",
  "UseCasesSection",
  "PricingSection",
  "FAQSection",
  "FooterMinimal",
] as const;

export type LandingSection = (typeof LANDING_SECTIONS)[number];
