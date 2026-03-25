/**
 * Landing Page Section Components
 */

// Micro Landing components (ML-1.x through ML-9.x)
export { AIConstellationMarquee } from "./AIConstellationMarquee";
export { AlternativeComparison } from "./AlternativeComparison";
export { BuildCostCalculator } from "./BuildCostCalculator";
export { CapabilityMatrixSection } from "./CapabilityMatrixSection";
export { DeploymentStats } from "./DeploymentStats";
// Legacy components (kept for backwards compat)
export { FeatureCards } from "./FeatureCards";
export { FinalCTA } from "./FinalCTA";
export { FooterMinimal } from "./FooterMinimal";
export { GlobalEdgeMap } from "./GlobalEdgeMap";
export { HeroSection } from "./HeroSection";
export { LogoStrip } from "./LogoStrip";
export { MonorepoFileTree } from "./MonorepoFileTree";
export { Navbar } from "./Navbar";
export { PricingHintSection } from "./PricingHintSection";
export { ProductDemoSection } from "./ProductDemoSection";
export { TestimonialsSection } from "./TestimonialsSection";
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
  "BuildCostCalculator",
  "AlternativeComparison",
  "FinalCTA",
  "FooterMinimal",
] as const;

export type LandingSection = (typeof LANDING_SECTIONS)[number];
