/**
 * Marketing Module Types
 *
 * Type definitions for all marketing components.
 * @see docs/MARKETING-INFRASTRUCTURE.md
 */

// =============================================================================
// Common Types
// =============================================================================

export type Locale = "en" | "zh" | "ja" | "ko" | "es" | "fr" | "de";

export type DensityMode = "compact" | "normal" | "spacious";

export interface BaseProps {
  /** Current locale for i18n */
  locale?: Locale;
  /** Section ID for anchor links */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Density mode */
  density?: DensityMode;
}

// =============================================================================
// Navigation Types
// =============================================================================

export interface NavLink {
  label: string;
  href: string;
  /** Sub-navigation items (for dropdowns) */
  children?: NavLink[];
  /** External link */
  external?: boolean;
  /** Badge text (e.g., "New", "Beta") */
  badge?: string;
}

export interface NavbarProps extends BaseProps {
  /** Navigation links */
  links?: NavLink[];
  /** Show announcement bar */
  showAnnouncement?: boolean;
  /** Announcement content */
  announcement?: {
    text: string;
    href?: string;
    dismissible?: boolean;
  };
  /** Show locale switcher */
  showLocaleSwitcher?: boolean;
  /** CTA button config */
  cta?: {
    text: string;
    href: string;
    variant?: "primary" | "outline";
  };
}

export interface FooterProps extends BaseProps {
  /** Footer link sections */
  sections?: {
    title: string;
    links: NavLink[];
  }[];
  /** Social media links */
  social?: {
    platform: "twitter" | "github" | "linkedin" | "discord" | "youtube";
    href: string;
  }[];
  /** Show newsletter signup */
  showNewsletter?: boolean;
  /** Copyright text */
  copyright?: string;
}

// =============================================================================
// Hero Types
// =============================================================================

export interface HeroProps extends BaseProps {
  /** Layout variant */
  variant?: "default" | "centered" | "split" | "video" | "3d";
  /** Background type */
  backgroundType?: "gradient" | "mesh" | "particles" | "video" | "image";
  /** Headline text */
  headline?: string;
  /** Subheadline text */
  subheadline?: string;
  /** Primary CTA */
  primaryCTA?: {
    text: string;
    href: string;
  };
  /** Secondary CTA */
  secondaryCTA?: {
    text: string;
    href: string;
  };
  /** Show trust badges/logos */
  showTrustBadges?: boolean;
  /** Custom media (image/video) */
  media?: {
    type: "image" | "video" | "3d";
    src: string;
    alt?: string;
  };
}

// =============================================================================
// Features Types
// =============================================================================

export interface Feature {
  id: string;
  title: string;
  description: string;
  /** Icon name from design-system */
  icon?: string;
  /** Link to detail page */
  href?: string;
  /** Badge (e.g., "New", "Beta") */
  badge?: string;
  /** Custom image/illustration */
  image?: string;
}

export interface FeaturesProps extends BaseProps {
  /** Layout variant */
  layout?: "grid" | "bento" | "alternating" | "tabs";
  /** Number of columns (for grid layout) */
  columns?: 2 | 3 | 4;
  /** Show icons */
  showIcons?: boolean;
  /** Feature items */
  features?: Feature[];
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
}

// =============================================================================
// Use Cases Types
// =============================================================================

export interface UseCase {
  id: string;
  title: string;
  description: string;
  /** Target audience/industry */
  audience: string;
  /** Icon or image */
  icon?: string;
  image?: string;
  /** Link to detail page */
  href?: string;
  /** Key benefits */
  benefits?: string[];
}

export interface UseCasesProps extends BaseProps {
  /** Layout variant */
  layout?: "tabs" | "carousel" | "grid" | "cards";
  /** Use case items */
  useCases?: UseCase[];
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
}

// =============================================================================
// Social Proof Types
// =============================================================================

export interface Logo {
  name: string;
  src: string;
  href?: string;
}

export interface Stat {
  value: string | number;
  label: string;
  /** Prefix (e.g., "$", "+") */
  prefix?: string;
  /** Suffix (e.g., "%", "K", "M") */
  suffix?: string;
}

export interface SocialProofProps extends BaseProps {
  /** Client/partner logos */
  logos?: Logo[];
  /** Statistics/metrics */
  stats?: Stat[];
  /** Layout variant */
  variant?: "logos-only" | "stats-only" | "combined";
  /** Section title */
  title?: string;
  /** Animate numbers */
  animateStats?: boolean;
}

// =============================================================================
// Pricing Types
// =============================================================================

export interface PricingFeature {
  text: string;
  included: boolean;
  /** Tooltip explanation */
  tooltip?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency?: string;
  };
  features: PricingFeature[];
  cta: {
    text: string;
    href: string;
    variant?: "primary" | "outline";
  };
  /** Highlight as popular/recommended */
  popular?: boolean;
  /** Badge text */
  badge?: string;
}

export interface PricingProps extends BaseProps {
  /** Pricing plans */
  plans?: PricingPlan[];
  /** Default billing cycle */
  defaultBillingCycle?: "monthly" | "yearly";
  /** Show billing toggle */
  showBillingToggle?: boolean;
  /** Show comparison table */
  showComparison?: boolean;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Yearly discount percentage */
  yearlyDiscount?: number;
}

// =============================================================================
// Testimonials Types
// =============================================================================

export interface Testimonial {
  id: string;
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar?: string;
  };
  /** Star rating (1-5) */
  rating?: number;
  /** Featured/highlighted */
  featured?: boolean;
}

export interface TestimonialsProps extends BaseProps {
  /** Testimonial items */
  testimonials?: Testimonial[];
  /** Layout variant */
  layout?: "carousel" | "grid" | "masonry" | "single";
  /** Auto-rotate carousel */
  autoRotate?: boolean;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
}

// =============================================================================
// FAQ Types
// =============================================================================

export interface FAQItem {
  question: string;
  /** Answer (supports markdown) */
  answer: string;
  /** Category for filtering */
  category?: string;
}

export interface FAQProps extends BaseProps {
  /** FAQ items */
  items?: FAQItem[];
  /** Show category filter */
  showCategories?: boolean;
  /** Layout variant */
  layout?: "accordion" | "two-column" | "cards";
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
}

// =============================================================================
// CTA Types
// =============================================================================

export interface CTAProps extends BaseProps {
  /** Variant */
  variant?: "simple" | "split" | "centered" | "gradient";
  /** Headline */
  headline?: string;
  /** Subheadline */
  subheadline?: string;
  /** Primary CTA */
  primaryCTA?: {
    text: string;
    href: string;
  };
  /** Secondary CTA */
  secondaryCTA?: {
    text: string;
    href: string;
  };
  /** Show trust elements */
  showTrust?: boolean;
  /** Background type */
  backgroundType?: "gradient" | "solid" | "image";
}
