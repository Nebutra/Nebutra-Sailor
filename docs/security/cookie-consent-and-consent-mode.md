# Cookie consent & Consent Mode

**Visibility:** G39, G40, G41, G56  
**Last updated:** 2026-07-27

## First-party consent (shipped)

- UI: `CookieConsentBanner` on landing layouts
- Storage: `localStorage` key `nebutra_consent_v1`
- Gate: `hasAnalyticsConsent()` before PostHog emit and Vercel Analytics/SpeedInsights

Choices:

| Button | Effect |
| --- | --- |
| Essential only | `analytics: false` — no non-essential tags |
| Accept analytics | `analytics: true` — tags may load |

## Google Consent Mode / TCF (G41)

Nebutra marketing does **not** require Google Ads TCF by default. When Ads /
GTM is introduced:

1. Load gtag with `ads_storage` / `analytics_storage` default **denied**
2. On accept analytics, call `gtag('consent', 'update', { analytics_storage: 'granted' })`
3. Keep first-party consent store as source of truth

Until GTM is enabled, G41 is satisfied by the documented integration path above
plus first-party gating of all current analytics sinks.

## Privacy ↔ analytics coupling (G56)

| Sink | Gated by consent |
| --- | --- |
| `emitBrowserEvent` (PostHog capture) | Yes |
| Vercel Analytics / Speed Insights | Yes (`ConsentGatedTelemetry`) |
| Essential session / locale cookies | No (necessary) |
