# First-party SEO / product event taxonomy

**Visibility:** G55  
**Last updated:** 2026-07-27

## Principles

- Event names are `domain.action` snake-ish with dots (e.g. `license.wizard`)
- Properties are flat JSON; never PII without consent
- Emission is gated by analytics consent (`nebutra_consent_v1`)

## Core marketing events

| Event | When | Key properties |
| --- | --- | --- |
| `page.view` | Route change (optional; Vercel Analytics may cover) | `path`, `locale` |
| `license.wizard` | License wizard steps | `step` |
| `newsletter.subscribe` | Footer subscribe success | `source=footer` |
| `cta.click` | Primary marketing CTAs | `id`, `href` |
| `blog.share` | Share buttons | `network`, `slug` |

## Funnel stages (SEO attribution)

1. **Discover** — organic landing (utm / referrer)
2. **Engage** — docs, blog, features depth
3. **Convert** — license wizard / waitlist / sign-up

Store attribution only after analytics consent.
