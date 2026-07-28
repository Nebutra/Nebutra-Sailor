# Search Console / Bing verification

**Visibility:** G3  
**Last updated:** 2026-07-27

## Where verification lives

| Channel | Location | Notes |
| --- | --- | --- |
| Google Search Console | DNS TXT on apex **or** meta tag | Prefer DNS for multi-app |
| Bing Webmaster | DNS or `BingSiteAuth.xml` | Prefer DNS |
| Optional meta | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Wired in landing root metadata |

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
