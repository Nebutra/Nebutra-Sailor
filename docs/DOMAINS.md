# Domain Configuration

## Domain Structure

| Subdomain | App | Purpose |
|-----------|-----|---------|
| `nebutra.com` | landing-page | Marketing site |
| `www.nebutra.com` | landing-page | Redirect to apex |
| `app.nebutra.com` | web | Main SaaS dashboard |
| `api.nebutra.com` | api-gateway | BFF API endpoints |
| `sso.nebutra.com` | idp | Nebutra-owned OIDC issuer for first-party/internal apps |
| `design.nebutra.com` | design-docs | Design system docs |
| `docs.nebutra.com` | sailor-docs (Vercel project `docs`) | Product/docs site |
| `nebutra.sanity.studio` | studio | Canonical Sanity-hosted Studio |
| `studio.nebutra.com` | studio | Optional branded Studio alias; requires external DNS/hosting binding |

## DNS Configuration

Add these records in your DNS provider (Cloudflare, Namecheap, etc.):

```
Type    Name      Value                    TTL
----    ----      -----                    ---
A       @         76.76.21.21              Auto
CNAME   www       cname.vercel-dns.com     Auto
CNAME   app       cname.vercel-dns.com     Auto
CNAME   api       cname.vercel-dns.com     Auto
CNAME   sso       <idp host>               Auto
CNAME   studio    <studio host>            Auto
```

> Note: The A record IP (76.76.21.21) is Vercel's. Use CNAME for subdomains.
> `studio.nebutra.com` must point at the platform that actually serves the
> Studio. The checked-in Studio CLI currently deploys to Sanity-hosted
> `nebutra.sanity.studio`; if you want the branded `studio.nebutra.com` URL,
> self-host the Studio on Vercel/Cloudflare Pages or configure a supported
> custom-domain binding, then add that domain to Sanity CORS.

## Vercel Project Configuration

### 1. landing-page
- Domain: `nebutra.com`, `www.nebutra.com`
- Redirect: `www` → apex (301)

### 2. web
- Domain: `app.nebutra.com`

### 3. api-gateway
- Domain: `api.nebutra.com`

### 4. idp
- Domain: `sso.nebutra.com`
- Serves `https://sso.nebutra.com/.well-known/openid-configuration`
- Keep `OIDC_ISSUER=https://sso.nebutra.com` and do not path-prefix the issuer.

### 5. studio
- Canonical hosted Studio: `nebutra.sanity.studio`
- Optional branded domain: `studio.nebutra.com` after the hosting/DNS binding is
  active

## Environment Variables (Vercel)

Set these in each project's Vercel dashboard:

### All Projects
```
NEXT_PUBLIC_SITE_URL=https://nebutra.com
NEXT_PUBLIC_APP_URL=https://app.nebutra.com
NEXT_PUBLIC_API_URL=https://api.nebutra.com
NEXT_PUBLIC_STUDIO_URL=https://studio.nebutra.com
```

### idp
```
OIDC_ISSUER=https://sso.nebutra.com
OIDC_COOKIE_KEYS=<base64-48+>,<rotated-base64-48+>
REDIS_URL=redis://...
```

### api-gateway
```
LANDING_URL=https://nebutra.com
WEB_URL=https://app.nebutra.com
STUDIO_URL=https://studio.nebutra.com
```

## Clerk Configuration

Update Clerk dashboard:
1. Go to **Domains** → Add production domain
2. Add: `nebutra.com`, `app.nebutra.com`
3. Update redirect URLs in **Paths**:
   - Sign-in: `https://app.nebutra.com/sign-in`
   - Sign-up: `https://app.nebutra.com/sign-up`
   - After sign-in: `https://app.nebutra.com/dashboard`
4. For Enterprise SSO, add each customer or first-party domain to a Clerk SAML
   or OIDC connection. Add `https://app.nebutra.com/sign-in` as the SSO
   callback/continuation URL and keep the provider's domain matching rules in
   sync with `AUTH_SSO_DISCOVERY_PROVIDERS`.

Example `AUTH_SSO_DISCOVERY_PROVIDERS` for Clerk Enterprise SSO:

```json
[
  {
    "domain": "nebutra.com",
    "id": "nebutra-entra",
    "name": "Nebutra Entra ID",
    "type": "oidc",
    "provider": "clerk",
    "allowSubdomains": false
  }
]
```

`provider: "clerk"` uses the built-in `/sign-in/sso` handoff. Use
`provider: "feishu"` for Feishu/Lark SSO through Better Auth generic OAuth.
Configure this redirect URI in the Feishu/Lark developer console:

```text
https://app.nebutra.com/api/auth/oauth2/callback/feishu
```

Example discovery entry:

```json
[
  {
    "domain": "example.cn",
    "id": "example-feishu",
    "name": "Example Feishu",
    "type": "oidc",
    "provider": "feishu"
  }
]
```

Set `FEISHU_APP_ID` and `FEISHU_APP_SECRET` on Vercel and the ECS/cloud-VM
runtime whenever a Feishu discovery entry is enabled. Use `provider: "generic"`
only when an external SAML/OIDC broker owns the handoff, and then set an
internal `loginUrl`. Set `allowSubdomains: true` only if the IdP and SSO
connection also allow subdomains.

## Sanity CORS

In Sanity dashboard (manage.sanity.io):
1. Go to **API** → **CORS origins**
2. Add:
   - `https://nebutra.com`
   - `https://app.nebutra.com`
   - `https://nebutra.sanity.studio` (with credentials)
   - `https://studio.nebutra.com` (with credentials) if the branded alias is active

## SSL/TLS

Vercel automatically provisions SSL certificates. No action needed.

## Verification Checklist

- [ ] DNS propagated (check with `dig app.nebutra.com`)
- [ ] SSL certificates active (green lock)
- [ ] CORS working (no console errors)
- [ ] Clerk auth redirects correctly
- [ ] API calls from app → api working
- [ ] Canonical URLs pass `pnpm check:public-urls`
- [ ] Branded aliases pass `pnpm run check:public-urls -- --include-aliases`
- [ ] OIDC discovery returns `issuer: "https://sso.nebutra.com"`
