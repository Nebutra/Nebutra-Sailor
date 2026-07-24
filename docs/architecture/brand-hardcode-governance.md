# Brand hardcode governance

## SSOT

| Concern | Source | Command / helper |
|---------|--------|------------------|
| Name, legal | brand-types → @nebutra/brand | brand:apply |
| Hosts | brand.domains | getBrandOrigin, getBrandPublicUrls |
| Cookie domain | landing apex | getBrandCookieDomain |
| DNS | domains + topology.defaults.yaml | dns:render |
| Vercel env | domains | brand:apply → vercel.json |
| Colors | tokens | var(--brand-*) |

## Runtime rule

Never hardcode product hosts, brand names, cookie domains, or brand hex in apps/packages/backends.
Use @nebutra/brand helpers.

## Allowed

DEFAULT_BRAND, brand package, docs/CHANGELOG, tests/stories, live nginx/CI dogfood URLs.

## Rebrand

pnpm brand:apply && pnpm dns:render
