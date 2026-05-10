# @nebutra/marketing

Marketing infrastructure for Nebutra - Product Hunt integration, testimonials, social proof, and attribution tracking.

## Installation

```bash
pnpm add @nebutra/marketing
```

## Features

- **Product Hunt Integration**: Badges, launch banners, upvote buttons
- **Testimonials Wall**: Display user feedback with multiple layouts
- **Social Proof**: Stats, trust badges, animated counters
- **Attribution Tracking**: UTM parsing, source detection, event tracking
- **React Hooks**: Easy access to attribution data and marketing events

## Quick Start

### Product Hunt Badge

```tsx
import { ProductHuntBadge, ProductHuntUpvoteBadge } from "@nebutra/marketing";

// Standard badge
<ProductHuntBadge postSlug="nebutra" theme="light" size="medium" />

// Upvote CTA button
<ProductHuntUpvoteBadge postSlug="nebutra" theme="light" size="medium" />

// Text link
<ProductHuntTextBadge postSlug="nebutra" theme="light" />
```

### Launch Banner

```tsx
import { LaunchBanner } from "@nebutra/marketing";

// Top banner (fixed at top)
<LaunchBanner
  title="We're live on Product Hunt!"
  subtitle="Support us and help spread the word"
  ctaText="Vote Now"
  ctaLink="https://producthunt.com/posts/nebutra"
  variant="top"
  theme="product-hunt"
  showCountdown
  countdownEndDate="2025-01-15T00:00:00Z"
/>

// Floating banner (bottom-right)
<LaunchBanner variant="floating" {...props} />

// Inline banner (in page content)
<LaunchBanner variant="inline" {...props} />
```

### Testimonials

```tsx
import { TestimonialsWall, type Testimonial } from "@nebutra/marketing";

const testimonials: Testimonial[] = [
  {
    id: "1",
    authorName: "John Doe",
    authorRole: "CEO",
    authorCompany: "Acme Inc",
    authorAvatar: "/avatars/john.jpg",
    content: "Nebutra transformed our development workflow!",
    rating: 5,
    source: "product-hunt",
    sourceUrl: "https://producthunt.com/posts/nebutra#comment-123",
    date: "2025-01-01",
    featured: true,
  },
  // More testimonials...
];

// Grid layout
<TestimonialsWall testimonials={testimonials} variant="grid" columns={3} />

// Masonry layout
<TestimonialsWall testimonials={testimonials} variant="masonry" columns={3} />

// Marquee (auto-scrolling)
<TestimonialsWall
  testimonials={testimonials}
  variant="marquee"
  scrollSpeed="normal"
/>
```

### Social Proof

```tsx
import { SocialProofBar, TrustBadges, FeaturedIn } from "@nebutra/marketing";

// Stats bar
<SocialProofBar
  stats={{
    users: 10000,
    companies: 500,
    countries: 50,
    rating: 4.9,
    productHuntUpvotes: 1200,
    githubStars: 5000,
  }}
  variant="badges" // or "minimal" | "detailed"
  animated
/>

// Trust badges
<TrustBadges
  badges={[
    { id: "soc2", name: "SOC 2", imageUrl: "/badges/soc2.svg", altText: "SOC 2 Compliant" },
    { id: "gdpr", name: "GDPR", imageUrl: "/badges/gdpr.svg", altText: "GDPR Ready" },
  ]}
  variant="row"
  size="medium"
/>

// Featured in section
<FeaturedIn
  title="As seen in"
  badges={[
    { id: "tc", name: "TechCrunch", imageUrl: "/logos/techcrunch.svg", altText: "TechCrunch" },
    { id: "ph", name: "Product Hunt", imageUrl: "/logos/producthunt.svg", altText: "Product Hunt" },
  ]}
/>
```

### Attribution Tracking

```tsx
import { useAttribution, useMarketingEvents } from "@nebutra/marketing";

function MyComponent() {
  const { isFromProductHunt, source, medium, campaign } = useAttribution();
  const { track, trackCTA } = useMarketingEvents();

  // Show special content for PH visitors
  if (isFromProductHunt) {
    return <WelcomeFromProductHunt />;
  }

  // Track CTA clicks
  const handleClick = () => {
    trackCTA("signup_button");
    // ...
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

### UTM Utilities

```tsx
import {
  parseUTMParams,
  addUTMParams,
  createProductHuntLink,
  trackSignup,
  trackConversion,
} from "@nebutra/marketing";

// Parse UTM from current URL
const utmParams = parseUTMParams();
// { utm_source: "product_hunt", utm_medium: "referral", ... }

// Add UTM to a link
const trackedUrl = addUTMParams("https://nebutra.com/signup", {
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "launch",
});

// Create PH link with tracking
const phLink = createProductHuntLink("nebutra", "homepage_badge");

// Track events
trackSignup({ plan: "pro" });
trackConversion("paid", { amount: 99 });
```

## Configuration

```tsx
import {
  createMarketingConfig,
  createProductHuntConfig,
} from "@nebutra/marketing";

const marketingConfig = createMarketingConfig({
  companyName: "Nebutra",
  website: "https://nebutra.com",
  social: {
    twitter: "https://twitter.com/nebutra",
    github: "https://github.com/nebutra",
  },
  analytics: {
    enableAttribution: true,
    requireConsent: false,
  },
});

const phConfig = createProductHuntConfig({
  postSlug: "nebutra",
  productName: "Nebutra",
  launchDate: "2025-01-15T00:00:00Z",
  isLaunching: true,
});
```

## Components

| Component                | Description                               |
| ------------------------ | ----------------------------------------- |
| `ProductHuntBadge`       | Styled PH badge with theme/size variants  |
| `ProductHuntEmbedBadge`  | Official PH widget badge                  |
| `ProductHuntUpvoteBadge` | CTA button for upvoting                   |
| `ProductHuntTextBadge`   | Minimal text link                         |
| `LaunchBanner`           | Announcement banner (top/floating/inline) |
| `TestimonialsWall`       | Grid/masonry/marquee testimonial layouts  |
| `TestimonialCard`        | Individual testimonial card               |
| `SocialProofBar`         | Stats display (minimal/badges/detailed)   |
| `TrustBadges`            | Display trust/security badges             |
| `FeaturedIn`             | "As seen in" section                      |

## Hooks

| Hook                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `useAttribution`       | Access attribution data and PH detection |
| `useProductHuntSource` | Check if user came from Product Hunt     |
| `useLaunchBannerState` | Manage banner dismissal state            |
| `useCountdown`         | Countdown timer for launches             |
| `useMarketingEvents`   | Track marketing events                   |

## License

AGPL-3.0
