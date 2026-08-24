# Search Console / Bing verification

**Visibility:** G3  
**Last updated:** 2026-08-24

## Where verification lives

| Channel | Location | Notes |
| --- | --- | --- |
| Google Search Console | DNS TXT on apex **or** meta tag | Prefer DNS for multi-app |
| Bing Webmaster | DNS or `BingSiteAuth.xml` | Prefer DNS |
| Optional meta | `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` (or `NEXT_PUBLIC_*`) | Wired in landing **and** Forge root metadata |

Apex DNS verification covers every `*.nebutra.com` host. Still add a **URL-prefix** property for `https://forge.nebutra.com` and submit `https://forge.nebutra.com/sitemap.xml` — a new subdomain is not auto-discovered from the marketing sitemap.

## Meta tags (optional)

When env is set, landing emits:

```html
<meta name="google-site-verification" content="…" />
<meta name="msvalidate.01" content="…" />
```

See `apps/landing/src/app/[lang]/layout.tsx` / root metadata export.

## DNS (recommended)

Document records in the domain registrar / Cloudflare zone — not committed as
secrets. Operators record the verification code in the private ops vault.
