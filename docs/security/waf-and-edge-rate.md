# WAF rules & per-bot rate differentiation

**Visibility:** G22, G29, G63  
**Last updated:** 2026-07-27

## Separation of concerns

| Layer | Responsibility |
| --- | --- |
| `robots.ts` / bot policy matrix | Advisory crawl policy |
| Cloudflare WAF / rate limiting | Enforcement (authoritative) |
| App `proxy.ts` | Host allowlist, optional edge token, UA class annotation |

Supply-chain scans (`pnpm audit`, CodeQL) do **not** replace runtime WAF (G63).

## Codified intent (G29)

Preferred store for CF rules: Terraform / Cloudflare API as code under
`infra/` (operator-owned). Until then, document the rule set here:

1. Challenge high-risk countries only when abuse signals fire
2. Rate-limit AI scrapers (GPTBot, ClaudeBot, Bytespider, CCBot) more tightly than Googlebot
3. Block known vulnerability scanners on `/api/*`
4. Require managed challenge on repeated 404 storms

## App-side annotation (G22)

Landing proxy classifies UA into `ai` | `search` | `other` for logs and future
edge header forwarding. Per-IP numeric limits stay at the CDN.

See also: `docs/seo/bot-policy-matrix.md`.
