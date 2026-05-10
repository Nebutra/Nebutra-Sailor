/**
 * Marketing Module
 *
 * Reusable marketing components for landing pages and marketing sites.
 *
 * @see docs/MARKETING-INFRASTRUCTURE.md
 *
 * @example
 * ```tsx
 * import { Hero, Features, Pricing, FAQ } from "@nebutra/ui/marketing";
 *
 * export default function LandingPage() {
 *   return (
 *     <>
 *       <Navbar />
 *       <Hero headline="Build faster" />
 *       <Features features={[...]} />
 *       <Pricing plans={[...]} />
 *       <FAQ items={[...]} />
 *       <CTA headline="Get started today" />
 *       <Footer />
 *     </>
 *   );
 * }
 * ```
 */

export { CTA } from "./CTA";
// =============================================================================
// Subcomponents
// =============================================================================
export { GradientText } from "./components/GradientText";
export { LogoCloud } from "./components/LogoCloud";
export { StatsCounter } from "./components/StatsCounter";
export { FAQ } from "./FAQ";
export { Features } from "./Features";
export { Footer } from "./Footer";
export { Hero } from "./Hero";
// =============================================================================
// Main Sections
// =============================================================================
export { Navbar } from "./Navbar";
export { Pricing } from "./Pricing";
export { SocialProof } from "./SocialProof";
export { Testimonials } from "./Testimonials";
// =============================================================================
// Types
// =============================================================================
export * from "./types";
export { UseCases } from "./UseCases";

// =============================================================================
// HeroUI/MagicUI Migrated Components
// =============================================================================

export type {
  AnimatedHeadlineProps,
  AnimatedHeadlineWord,
} from "./animated-headline";
// Animated Headline (cycling gradient text)
export { AnimatedHeadline } from "./animated-headline";
export type { AuthPageProps } from "./auth-page";
// Auth Page (requires @clerk/nextjs)
export { AuthPage } from "./auth-page";
export type { AwardBadgeProps, AwardBadgeType } from "./award-badge";
// Award Badge (Product Hunt awards with 3D effect)
export { AWARD_BADGE_TITLES, AwardBadge } from "./award-badge";
export type { BannerProps } from "./banner";
// Banner (with Grid pattern)
export { Banner } from "./banner";
export type {
  BentoCardItem,
  BentoCardsProps,
  PlusCardProps,
} from "./bento-cards";
// Bento Cards (plus-icon grid)
export { BentoCards, CornerPlusIcons, PlusCard, PlusIcon } from "./bento-cards";
export type {
  CosmicSpectrumColorTheme,
  CosmicSpectrumProps,
} from "./cosmic-spectrum";
// Cosmic Spectrum (scroll-animated spectrum)
export { COSMIC_SPECTRUM_COLORS, CosmicSpectrum } from "./cosmic-spectrum";
export type { CTASectionProps } from "./cta-section";
// CTA Section (with decorative borders)
export { CTASection } from "./cta-section";
export type { CTAWithVerticalMarqueeProps } from "./cta-with-text-marquee";
// CTA with Vertical Marquee
export {
  default as CTAWithVerticalMarquee,
  VerticalMarquee,
} from "./cta-with-text-marquee";
export type { CustomerLogo, CustomersSectionProps } from "./customers-section";
// Customers Section (logo cloud with animation)
export { CustomersSection } from "./customers-section";
export type { DatabaseRestApiProps } from "./database-rest-api";
// Database REST API Visualization
export { DatabaseRestApi } from "./database-rest-api";
export type { FAQBlockProps, FAQItem } from "./faq-block";
// FAQ Block
export {
  default as FAQBlock,
  FAQBlock as FAQBlockComponent,
} from "./faq-block";
export type {
  CircularUIRowProps,
  FeatureCardItem,
  FeatureCardsSectionProps,
} from "./feature-cards-section";
// Feature Cards Section (bento-style with circular UI)
export { CircularUIRow, FeatureCardsSection } from "./feature-cards-section";
export type { CarouselSlide, FeatureCarouselProps } from "./feature-carousel";
// Feature Carousel
export { FeatureCarousel } from "./feature-carousel";
export type {
  FeatureSplitItem,
  FeatureSplitSectionProps,
} from "./feature-split-section";
// Feature Split Section (two-column layout)
export { FeatureSplitSection } from "./feature-split-section";
export type {
  DashboardPanelHeaderProps,
  FeaturedDashboardSectionProps,
} from "./featured-dashboard-section";
// Featured Dashboard Section (2x2 grid layout)
export {
  DashboardPanelHeader,
  FeaturedDashboardSection,
} from "./featured-dashboard-section";
export type {
  BentoFeatureCard,
  BentoStatCard,
  BentoTeamMember,
  FeaturesBentoSectionProps,
} from "./features-bento";
// Features Bento (6-card bento grid)
export { FeaturesBentoSection } from "./features-bento";
export type { FeatureItem, FeaturesGridProps } from "./features-grid";
// Features Grid (gradient cards)
export {
  DEFAULT_FEATURES,
  DecorativeGrid,
  FeaturesGrid,
} from "./features-grid";
export type {
  FeaturesShowcaseProps,
  ShowcaseFeature,
} from "./features-showcase";

// Features Showcase (image + feature grid)
export { FeaturesShowcase } from "./features-showcase";
export type {
  FooterDropdown,
  FooterDropdownItem,
  FooterLink,
  FooterLinkColumnProps,
  FooterLinkGroup,
  FooterSocialLink,
  FooterSocialLinksProps,
  SystemStatus,
  SystemStatusButtonProps,
} from "./footer-links";
// Footer Components (atomic footer building blocks)
export {
  DEFAULT_SOCIAL_LINKS,
  FooterLinkColumn,
  FooterSocialLinks,
  SystemStatusButton,
} from "./footer-links";
export type { GlobeProps } from "./globe";
// Globe (animated SVG illustration)
export { Globe } from "./globe";
export type { GridPatternProps } from "./grid-pattern";
// Decorative
export { GridPattern } from "./grid-pattern";
export type { HighlightCardColor, HighlightCardProps } from "./highlight-card";
// Highlight Card (animated metrics card with color themes)
export { HIGHLIGHT_CARD_THEMES, HighlightCard } from "./highlight-card";
export type { Logo, LogoCloudSliderProps } from "./logo-cloud";
// Logo Cloud Slider (infinite slider)
export { LogoCloudSlider } from "./logo-cloud";
export type { LogoCloudGridLogo, LogoCloudGridProps } from "./logo-cloud-grid";
// Logo Cloud Grid (decorative grid layout)
export { LogoCloudGrid } from "./logo-cloud-grid";
export type { MarqueeProps } from "./marquee";
// Marquee
export { Marquee } from "./marquee";
export type {
  PricingCardProps,
  PricingFrequencyToggleProps,
  PricingPlan,
  PricingSectionProps,
} from "./pricing-section";
// Pricing Section
export {
  BorderTrail,
  DEFAULT_PRICING_PLANS,
  PricingCard,
  PricingFrequencyToggle,
  PricingSection,
} from "./pricing-section";
export type { SmoothScrollHeroProps } from "./smooth-scroll-hero";
// Smooth Scroll Hero (parallax clip-path reveal)
export { SmoothScrollHero } from "./smooth-scroll-hero";
export type {
  StaggerTestimonialItem,
  StaggerTestimonialsProps,
} from "./stagger-testimonials";
// Stagger Testimonials
export { StaggerTestimonials } from "./stagger-testimonials";
export type {
  BulletItem,
  CodeDiffProps,
  DiffBlock,
  DiffLine,
  TerminalControlSectionAnimatedProps,
} from "./terminal-control-section-animated";
// Terminal Control Section (animated code diff showcase)
export {
  CodeDiff,
  DEFAULT_TERMINAL_ITEMS,
  TerminalControlSectionAnimated,
} from "./terminal-control-section-animated";
// Testimonials Registry (variant-based system)
export * from "./testimonials-registry";
export type { UpgradeBannerProps } from "./upgrade-banner";
// Upgrade Banner
export { UpgradeBanner } from "./upgrade-banner";
