/**
 * @nebutra/marketing - Type Definitions
 */

// ============================================
// Product Hunt Types
// ============================================

export interface ProductHuntConfig {
  /** Product Hunt post ID (from URL: producthunt.com/posts/{slug}) */
  postId?: string;
  /** Product Hunt post slug */
  postSlug: string;
  /** Product name as shown on Product Hunt */
  productName: string;
  /** Launch date (ISO 8601) */
  launchDate?: string;
  /** Whether the product is currently featured/launching */
  isLaunching?: boolean;
}

export type ProductHuntBadgeTheme = "light" | "dark" | "neutral";
export type ProductHuntBadgeSize = "small" | "medium" | "large";

export interface ProductHuntBadgeProps {
  /** Product Hunt post slug */
  postSlug: string;
  /** Product Hunt post ID (numeric, for embed) */
  postId?: string;
  /** Badge theme */
  theme?: ProductHuntBadgeTheme;
  /** Badge size */
  size?: ProductHuntBadgeSize;
  /** Alternative text for accessibility */
  altText?: string;
  /** Custom class name */
  className?: string;
  /** Whether to open in new tab */
  openInNewTab?: boolean;
  /** Show upvote count (requires API integration) */
  showUpvotes?: boolean;
}

// ============================================
// Testimonial Types
// ============================================

export type TestimonialSource =
  | "product-hunt"
  | "twitter"
  | "linkedin"
  | "g2"
  | "capterra"
  | "trustpilot"
  | "email"
  | "direct"
  | "other";

export interface Testimonial {
  /** Unique identifier */
  id: string;
  /** Author's display name */
  authorName: string;
  /** Author's role/title */
  authorRole?: string;
  /** Author's company */
  authorCompany?: string;
  /** Author's avatar URL */
  authorAvatar?: string;
  /** Testimonial text */
  content: string;
  /** Rating (1-5) */
  rating?: number;
  /** Source platform */
  source: TestimonialSource;
  /** Link to original testimonial */
  sourceUrl?: string;
  /** Date of testimonial */
  date?: string;
  /** Whether to feature prominently */
  featured?: boolean;
  /** Tags for filtering */
  tags?: string[];
}

export interface TestimonialsWallProps {
  /** List of testimonials */
  testimonials: Testimonial[];
  /** Layout variant */
  variant?: "grid" | "masonry" | "carousel" | "marquee";
  /** Number of columns (for grid/masonry) */
  columns?: 1 | 2 | 3 | 4;
  /** Whether to show source icons */
  showSourceIcons?: boolean;
  /** Whether to show ratings */
  showRatings?: boolean;
  /** Whether to auto-scroll (for marquee) */
  autoScroll?: boolean;
  /** Scroll speed (for marquee) */
  scrollSpeed?: "slow" | "normal" | "fast";
  /** Maximum testimonials to show */
  maxItems?: number;
  /** Filter by source */
  filterSource?: TestimonialSource[];
  /** Custom class name */
  className?: string;
}

// ============================================
// Social Proof Types
// ============================================

export interface SocialProofStats {
  /** Number of users */
  users?: number;
  /** Number of companies */
  companies?: number;
  /** Number of countries */
  countries?: number;
  /** Average rating */
  rating?: number;
  /** Number of reviews */
  reviews?: number;
  /** Product Hunt upvotes */
  productHuntUpvotes?: number;
  /** GitHub stars */
  githubStars?: number;
  /** Custom stats */
  custom?: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
  }>;
}

export interface SocialProofBarProps {
  /** Statistics to display */
  stats: SocialProofStats;
  /** Display variant */
  variant?: "minimal" | "badges" | "detailed";
  /** Whether to animate numbers */
  animated?: boolean;
  /** Custom class name */
  className?: string;
}

export interface TrustBadge {
  /** Badge ID */
  id: string;
  /** Badge name */
  name: string;
  /** Badge image URL */
  imageUrl: string;
  /** Link URL */
  linkUrl?: string;
  /** Alt text */
  altText: string;
}

export interface TrustBadgesProps {
  /** Badges to display */
  badges: TrustBadge[];
  /** Display variant */
  variant?: "row" | "grid";
  /** Badge size */
  size?: "small" | "medium" | "large";
  /** Custom class name */
  className?: string;
}

// ============================================
// Launch Banner Types
// ============================================

export interface LaunchBannerProps {
  /** Banner title */
  title: string;
  /** Banner subtitle */
  subtitle?: string;
  /** CTA button text */
  ctaText: string;
  /** CTA button link */
  ctaLink: string;
  /** Banner variant */
  variant?: "top" | "floating" | "inline";
  /** Theme */
  theme?: "product-hunt" | "brand" | "neutral";
  /** Whether banner is dismissible */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Whether to show countdown */
  showCountdown?: boolean;
  /** Countdown end date (ISO 8601) */
  countdownEndDate?: string;
  /** Custom class name */
  className?: string;
}

// ============================================
// Attribution & Analytics Types
// ============================================

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface AttributionData {
  /** Source of the visit */
  source: string;
  /** Medium (organic, paid, referral, etc.) */
  medium: string;
  /** Campaign name */
  campaign?: string;
  /** Referrer URL */
  referrer?: string;
  /** Landing page */
  landingPage: string;
  /** First touch timestamp */
  firstTouch: string;
  /** Last touch timestamp */
  lastTouch: string;
  /** Session ID */
  sessionId: string;
  /** UTM parameters */
  utmParams?: UTMParams;
}

export interface MarketingEvent {
  /** Event name */
  name: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** Timestamp */
  timestamp?: string;
  /** Attribution data */
  attribution?: AttributionData;
}

// ============================================
// Configuration Types
// ============================================

export interface MarketingConfig {
  /** Product Hunt configuration */
  productHunt?: ProductHuntConfig;
  /** Company name */
  companyName: string;
  /** Company website */
  website: string;
  /** Social links */
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
  };
  /** Analytics configuration */
  analytics?: {
    /** Enable attribution tracking */
    enableAttribution?: boolean;
    /** Cookie consent required */
    requireConsent?: boolean;
    /** Storage key prefix */
    storagePrefix?: string;
  };
}
