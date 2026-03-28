/**
 * Landing Page Section Components
 */

// Micro Landing components (ML-1.x through ML-9.x)
export { AgenticCapabilitiesSection } from "./AgenticCapabilitiesSection";
export { AgenticEngineeringSection } from "./AgenticEngineeringSection";
export { AIConstellationMarquee } from "./AIConstellationMarquee";
export { AlternativeComparison } from "./AlternativeComparison";
export { BlogShowcase, type BlogShowcaseProps } from "./BlogShowcase";
export { CapabilityMatrixSection } from "./CapabilityMatrixSection";

export { DesignSystemSection } from "./DesignSystemSection";
// Legacy components (kept for backwards compat)
export { FeatureCards } from "./FeatureCards";
export { FinalCTA } from "./FinalCTA";
export { FooterMinimal } from "./FooterMinimal";
export { GlobalEdgeMap } from "./GlobalEdgeMap";
export { HarnessEngineeringSection } from "./HarnessEngineeringSection";
export { HeroSection } from "./HeroSection";
export { LogoStrip } from "./LogoStrip";
export { MonorepoFileTree } from "./MonorepoFileTree";
export { Navbar } from "./Navbar";
export { NewsletterForm } from "./NewsletterForm";
export { PricingHintSection } from "./PricingHintSection";
export { PricingSection } from "./PricingSection";
export { ProductDemoSection } from "./ProductDemoSection";
export { ProductShowcase } from "./ProductShowcase";
export { TestimonialsSection } from "./TestimonialsSection";
export { UseCasesSection } from "./use-cases";
export { VelocityEngineSection } from "./VelocityEngineSection";
export { VelocitySignalStrip } from "./VelocitySignalStrip";
export { WorkflowSection } from "./WorkflowSection";

export const LANDING_SECTIONS = [
  "Navbar",
  "HeroSection",
  "VelocitySignalStrip",
  "AIConstellationMarquee",
  "ProductDemoSection",
  "CapabilityMatrixSection",
  "VelocityEngineSection",
  "TestimonialsSection",
  "MonorepoFileTree",
  "GlobalEdgeMap",
  "AlternativeComparison",
  "FinalCTA",
  "FooterMinimal",
] as const;

export type LandingSection = (typeof LANDING_SECTIONS)[number];
export { HeroMockupWindow } from "./HeroMockupWindow";
