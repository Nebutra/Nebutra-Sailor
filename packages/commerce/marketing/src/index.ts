/**
 * @nebutra/marketing
 *
 * Marketing infrastructure for Nebutra - Product Hunt integration,
 * testimonials, social proof, and attribution tracking.
 *
 * @todo Redesign components before PH launch:
 *   - ProductHuntBadge: Improve visual hierarchy and integrate with HeroUI/MagicUI design tokens
 *   - SocialProofBar: Better typography and spacing, add animation polish
 *   - TestimonialsWall: Redesign cards to match landing page aesthetic
 *   - LaunchBanner: More subtle, less intrusive design
 *   - Consider using Framer Motion for micro-interactions
 *   - Ensure all components work seamlessly with dark mode
 *
 * ## CSS Setup
 *
 * Import the CSS tokens for proper theming:
 * ```tsx
 * import "@nebutra/marketing/styles/tokens.css";
 * ```
 *
 * @example
 * ```tsx
 * import {
 *   ProductHuntBadge,
 *   LaunchBanner,
 *   TestimonialsWall,
 *   SocialProofBar,
 *   useAttribution,
 * } from "@nebutra/marketing";
 *
 * // Display Product Hunt badge
 * <ProductHuntBadge postSlug="nebutra" theme="light" size="medium" />
 *
 * // Show launch banner
 * <LaunchBanner
 *   title="We're live on Product Hunt!"
 *   ctaText="Support us"
 *   ctaLink="https://producthunt.com/posts/nebutra"
 *   variant="top"
 *   theme="product-hunt"
 * />
 *
 * // Display testimonials
 * <TestimonialsWall testimonials={testimonials} variant="grid" columns={3} />
 *
 * // Show social proof stats
 * <SocialProofBar
 *   stats={{ users: 1000, rating: 4.8, productHuntUpvotes: 500 }}
 *   variant="badges"
 * />
 *
 * // Track attribution
 * const { isFromProductHunt, source, campaign } = useAttribution();
 * ```
 */

export type {
  FAQItem,
  FAQProps,
  FeaturedInProps,
  PricingPlan,
  PricingTableProps,
  WaitlistProps,
} from "./components";
// ============================================
// Components
// ============================================
export {
  AnimatedNumber,
  FAQ,
  FeaturedIn,
  // Launch Banners
  LaunchBanner,
  LaunchBannerFloating,
  LaunchBannerInline,
  LaunchBannerTop,
  PricingTable,
  // Product Hunt
  ProductHuntBadge,
  ProductHuntEmbedBadge,
  ProductHuntTextBadge,
  ProductHuntUpvoteBadge,
  RatingStars,
  // Social Proof
  SocialProofBar,
  SourceBadge,
  StatItem,
  TestimonialCard,
  // Testimonials
  TestimonialsWall,
  TrustBadges,
  // SaaS Conversion Kit
  Waitlist,
} from "./components";
export type { ShareUrls } from "./config";
// ============================================
// Configuration
// ============================================
export {
  // Creators
  createMarketingConfig,
  createProductHuntConfig,
  // Defaults
  defaultMarketingConfig,
  defaultProductHuntConfig,
  generateShareUrls,
  getProductHuntBadgeUrl,
  getProductHuntUpvoteUrl,
  // URL Builders
  getProductHuntUrl,
  // Constants
  PRODUCT_HUNT_COLORS,
  TESTIMONIAL_SOURCE_ICONS,
  TESTIMONIAL_SOURCE_NAMES,
} from "./config";
// ============================================
// Hooks
// ============================================
export {
  useAttribution,
  useCountdown,
  useInView,
  useLaunchBannerState,
  useMarketingEvents,
  useProductHuntSource,
} from "./hooks";
// ============================================
// Types
// ============================================
export type {
  AttributionData,
  // Launch Banner
  LaunchBannerProps,
  // Config
  MarketingConfig,
  MarketingEvent,
  ProductHuntBadgeProps,
  ProductHuntBadgeSize,
  ProductHuntBadgeTheme,
  // Product Hunt
  ProductHuntConfig,
  SocialProofBarProps,
  // Social Proof
  SocialProofStats,
  Testimonial,
  // Testimonials
  TestimonialSource,
  TestimonialsWallProps,
  TrustBadgesProps,
  // Attribution
  UTMParams,
} from "./types";
// ============================================
// Utilities
// ============================================
export {
  addUTMParams,
  cleanUrlForAnalytics,
  clearMarketingEvents,
  createProductHuntLink,
  createProductHuntUTM,
  // URL Utilities
  createTrackedLink,
  detectMedium,
  // Source Detection
  detectSourceFromReferrer,
  generateSessionId,
  getAttribution,
  getFirstTouchAttribution,
  getMarketingEvents,
  hasUTMParams,
  // Attribution
  initAttribution,
  // UTM
  parseUTMParams,
  removeUTMParams,
  saveAttribution,
  trackConversion,
  // Event Tracking
  trackMarketingEvent,
  trackProductHuntVisit,
  trackSignup,
} from "./utils";
