# @nebutra/analytics

Link attribution, conversion tracking, and growth analytics powered by Dub.

## Overview

This package provides:
- **Link Attribution** — Track clicks, referrals, and conversions
- **Short Links** — Generate branded short URLs
- **Referral System** — Affiliate and invite tracking
- **Multi-tenant Analytics** — Tenant-scoped metrics and reports

## Installation

```bash
pnpm add @nebutra/analytics
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    @nebutra/analytics                        │
├─────────────────────────────────────────────────────────────┤
│  Client (Browser)    │  Server (Node.js)   │  API Gateway   │
│  ─────────────────   │  ─────────────────  │  ────────────  │
│  • Click tracking    │  • Create links     │  • Rate limit  │
│  • Page views        │  • Get analytics    │  • Auth        │
│  • Conversions       │  • Manage domains   │  • Tenant ctx  │
│  • UTM handling      │  • Webhooks         │  • Billing     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Dub API/SDK   │
                    └─────────────────┘
```

## Quick Start

### Client-side (React/Next.js)

```tsx
import { AnalyticsProvider, useAnalytics } from "@nebutra/analytics/react";

// Wrap your app
function App() {
  return (
    <AnalyticsProvider
      tenantId="org_123"
      options={{ cookieConsent: true }}
    >
      <YourApp />
    </AnalyticsProvider>
  );
}

// Track events
function Button() {
  const { track } = useAnalytics();
  
  return (
    <button onClick={() => track("button_click", { buttonId: "cta" })}>
      Click me
    </button>
  );
}
```

### Server-side (Node.js)

```typescript
import { analytics } from "@nebutra/analytics";

// Create short link
const link = await analytics.links.create({
  url: "https://nebutra.com/pricing",
  domain: "go.nebutra.com",
  key: "pricing",
  tenantId: "org_123",
});
// Returns: https://go.nebutra.com/pricing

// Get link analytics
const stats = await analytics.links.getAnalytics({
  linkId: link.id,
  interval: "7d",
});
```

## Features

### Link Management

```typescript
// Create link with tracking
const link = await analytics.links.create({
  url: "https://shop.example.com/product/123",
  domain: "go.nebutra.com",
  tenantId: "org_123",
  tags: ["product", "campaign-q1"],
  utm: {
    source: "newsletter",
    medium: "email",
    campaign: "spring-sale",
  },
});

// Bulk create
const links = await analytics.links.createMany([
  { url: "https://example.com/a", key: "a" },
  { url: "https://example.com/b", key: "b" },
]);

// Update link
await analytics.links.update(linkId, {
  url: "https://new-url.com",
});

// Delete link
await analytics.links.delete(linkId);
```

### Conversion Tracking

```typescript
// Client-side: Track conversion
import { trackConversion } from "@nebutra/analytics";

trackConversion({
  eventName: "purchase",
  value: 99.99,
  currency: "USD",
  metadata: {
    orderId: "order_123",
    productId: "prod_456",
  },
});

// Server-side: Attribute conversion
await analytics.conversions.attribute({
  clickId: "click_abc",
  eventName: "purchase",
  value: 99.99,
  customerId: "cust_123",
});
```

### Referral Program

```typescript
// Create referral link for user
const referralLink = await analytics.referrals.createLink({
  userId: "user_123",
  tenantId: "org_456",
  rewardType: "credit",
  rewardValue: 10,
});

// Get user's referral stats
const stats = await analytics.referrals.getStats({
  userId: "user_123",
});
// { clicks: 150, signups: 23, conversions: 12, earned: 120 }

// Process referral reward
await analytics.referrals.processReward({
  referrerId: "user_123",
  referredId: "user_789",
  eventType: "signup",
});
```

### Analytics Queries

```typescript
// Get link performance
const performance = await analytics.getAnalytics({
  linkId: "link_123",
  interval: "30d",
  groupBy: ["country", "device", "browser"],
});

// Get tenant-wide metrics
const metrics = await analytics.getTenantMetrics({
  tenantId: "org_123",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
});

// Export analytics data
const csv = await analytics.exportAnalytics({
  tenantId: "org_123",
  format: "csv",
  dateRange: "last_30_days",
});
```

## Multi-tenant Configuration

```typescript
import { createAnalyticsClient } from "@nebutra/analytics";

const analytics = createAnalyticsClient({
  apiKey: process.env.DUB_API_KEY,
  
  // Multi-tenant settings
  tenantResolver: async (req) => {
    return req.headers["x-tenant-id"];
  },
  
  // Tenant-specific domains
  domains: {
    default: "go.nebutra.com",
    custom: async (tenantId) => {
      const tenant = await getTenant(tenantId);
      return tenant.customDomain || "go.nebutra.com";
    },
  },
  
  // Usage limits per plan
  limits: {
    FREE: { linksPerMonth: 100, clicksPerMonth: 10000 },
    PRO: { linksPerMonth: 1000, clicksPerMonth: 100000 },
    ENTERPRISE: { linksPerMonth: -1, clicksPerMonth: -1 },
  },
});
```

## Privacy & Compliance

### Cookie Consent

```tsx
import { AnalyticsProvider } from "@nebutra/analytics/react";

<AnalyticsProvider
  options={{
    cookieConsent: true,
    cookieBanner: true,
    anonymizeIp: true,
    respectDoNotTrack: true,
  }}
>
  <App />
</AnalyticsProvider>
```

### Data Handling

```typescript
// Anonymize user data
await analytics.anonymizeUser({
  userId: "user_123",
  tenantId: "org_456",
});

// Delete user data (GDPR)
await analytics.deleteUserData({
  userId: "user_123",
  tenantId: "org_456",
});

// Export user data (GDPR)
const data = await analytics.exportUserData({
  userId: "user_123",
});
```

## Webhooks

Handle Dub webhooks for real-time events:

```typescript
import { handleWebhook } from "@nebutra/analytics";

// In API route
export async function POST(req: Request) {
  const event = await handleWebhook(req, {
    secret: process.env.DUB_WEBHOOK_SECRET,
  });
  
  switch (event.type) {
    case "link.clicked":
      await recordClick(event.data);
      break;
    case "link.created":
      await notifyLinkCreated(event.data);
      break;
    case "conversion.completed":
      await processConversion(event.data);
      break;
  }
  
  return new Response("OK");
}
```

## Environment Variables

```bash
# Dub API
DUB_API_KEY=dub_xxx
DUB_WORKSPACE_ID=ws_xxx
DUB_WEBHOOK_SECRET=whsec_xxx

# Default domain
DUB_DEFAULT_DOMAIN=go.nebutra.com

# Privacy
ANALYTICS_ANONYMIZE_IP=true
ANALYTICS_COOKIE_CONSENT=true
```

## Related

- [Dub Documentation](https://dub.co/docs)
- [Event Bus](../event-bus/) — Cross-service events
- [Audit](../audit/) — Activity logging
