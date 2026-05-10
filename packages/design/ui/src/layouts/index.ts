/**
 * Custom Layouts
 *
 * Product-specific layout patterns built on design-system primitives.
 * These provide consistent page structures across Nebutra products.
 */

// Dashboard layouts
// export { DashboardLayout } from "./DashboardLayout";
// export { SettingsLayout } from "./SettingsLayout";

// Marketing layouts
// export { MarketingLayout } from "./MarketingLayout";
// export { LandingLayout } from "./LandingLayout";

// Bento Grid
export { BentoGrid, type BentoGridProps, type BentoItem } from "./bento-grid";
export {
  SectionContainer,
  type SectionContainerProps,
  SectionContainerRoot,
  SectionContent,
  type SectionContentProps,
  SectionFooter,
  type SectionFooterProps,
  SectionHeader,
  type SectionHeaderProps,
} from "./SectionContainer";
// Section Theming (Visual Territories)
export {
  type SectionThemeConfig,
  sectionThemes,
  ThemedSection,
  type ThemedSectionProps,
} from "./SectionTheme";
