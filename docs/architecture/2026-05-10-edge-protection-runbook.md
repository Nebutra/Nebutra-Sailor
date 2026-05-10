# Edge Protection Runbook — Cloudflare + Vercel Firewall

> Last updated: 2026-05-10
> Owners: Platform / SRE
> Scope: `nebutra.com`, `app.nebutra.com`, `api.nebutra.com`, `studio.nebutra.com`

This runbook is the operational playbook for DDoS / bot protection, WAF, and challenge gating for all Nebutra public-facing surfaces. **All code-side hardening is already applied** (HSTS, COOP, dynamic CORS allowlist via Hono, Sentry, etc.). What remains is **dashboard configuration**.

---

## Architecture decision

```
Internet
   │
   ▼
┌─────────────────────────────┐
│  Cloudflare (orange cloud)  │  ← DNS + DDoS L3/L4/L7 + Bot Fight + WAF
│   - Bot Fight Mode          │
│   - Managed Rules           │
│   - Rate limiting (free)    │
│   - Turnstile (forms)       │
└─────────────────────────────┘
   │
   ▼
┌─────────────────────────────┐
│  Vercel Edge                │  ← Vercel Firewall (Custom Rules)
│   - Project-level WAF       │
│   - Attack Challenge Mode   │
│   - Per-route rules         │
└─────────────────────────────┘
   │
   ▼
┌─────────────────────────────┐
│  Hono / Next.js apps        │  ← Hono cors() + secureHeaders() + rate-limit
└─────────────────────────────┘
```

**Why both layers**:
- **Cloudflare** is the cheapest, fattest pipe — absorbs L3/L4 floods Vercel won't see.
- **Vercel Firewall** sees decoded HTTP after CF, can apply project-aware rules (per-route, per-deployment).
- They are complementary, not redundant.

---

## Phase 1 — Cloudflare (P0, do today)

### 1.1 Add domain & switch nameservers

```bash
# Verify current nameservers
dig nebutra.com NS +short
dig api.nebutra.com NS +short
```

If NS is not `*.ns.cloudflare.com`:

1. Cloudflare dashboard → **Add a Site** → enter `nebutra.com` → choose **Free** plan (upgrade to Pro $20/mo only if you need image optim or enhanced WAF rules)
2. Cloudflare auto-imports DNS records — **verify every A/CNAME/MX is correct** before flipping NS
3. At your registrar, change nameservers to the two CF nameservers shown
4. Propagation: 5 min – 24h. CF emails when active.

### 1.2 SSL/TLS

- Mode: **Full (strict)** — never use Flexible (downgrades origin TLS)
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON
- **Minimum TLS Version**: 1.2
- **HSTS**: already set in `vercel.json` for both apps; no need to enable at CF (avoid double-HSTS pinning conflicts)

### 1.3 DNS records — orange cloud (proxied)

| Hostname | Type | Target | Proxy |
|----------|------|--------|-------|
| `nebutra.com` (apex) | A / CNAME-flatten | Vercel ALIAS or `cname.vercel-dns.com` | 🟠 Orange |
| `www.nebutra.com` | CNAME | `cname.vercel-dns.com` | 🟠 Orange |
| `app.nebutra.com` | CNAME | `cname.vercel-dns.com` | 🟠 Orange |
| `api.nebutra.com` | CNAME | `cname.vercel-dns.com` | 🟠 Orange |
| `studio.nebutra.com` | CNAME | `cname.vercel-dns.com` | 🟠 Orange |
| `_vercel` TXT (verification) | TXT | `vc-domain-verify=...` | ⚪️ DNS only |

> **Vercel domain verification**: when CF proxies the apex, Vercel can't always autorenew TLS. Use Vercel's **Cloudflare integration** (Project → Domains → Add → choose CF) so CF terminates TLS at the edge and Vercel uses an internal cert. Or set CF SSL to Full (strict) and let Vercel cert validate via `_acme-challenge` TXT records (DNS-only, not proxied).

### 1.4 Security settings

- **Bot Fight Mode**: ON (free; blocks known bad bots, lightweight)
  - For Pro plan: use **Super Bot Fight Mode** (more granular: definitely automated → Block, likely automated → Managed Challenge)
- **Security Level**: **Medium** (default; only challenges high-threat IPs)
- **Challenge Passage**: 30 minutes
- **Browser Integrity Check**: ON

### 1.5 WAF Managed Rules (Free plan: 1 ruleset; Pro: more)

Enable:
- **Cloudflare Managed Ruleset** → All rules to **Managed Challenge** (not Block — too aggressive)
- **OWASP Core Ruleset** (Pro+) → Sensitivity Medium

### 1.6 Rate limiting (free tier: 1 rule)

Add this rule:

```
Name: api-write-protection
If: (http.host eq "api.nebutra.com" and http.request.method in {"POST" "PUT" "DELETE" "PATCH"})
Rate: 100 requests per 1 minute per IP
Action: Managed Challenge
```

### 1.7 Page Rules / Configuration Rules

For preview URLs (Vercel `*.vercel.app`), exclude them — they shouldn't go through CF anyway since they're not on `nebutra.com`.

For `api.nebutra.com`:
- **Cache Level**: Bypass (API responses must not be cached at edge)
- **Disable Performance** (no minify/Rocket Loader on JSON APIs)

### 1.8 Turnstile (replace reCAPTCHA)

- Cloudflare → Turnstile → Add Site
- Type: **Managed** (auto-detect; falls back to invisible / interactive)
- Use on: signup, login (after N failed attempts), public forms (contact, demo request)
- The codebase already has `packages/iam/captcha/src/server/turnstile.ts` scaffold — finish wiring after dashboard config.

### 1.9 Under Attack Mode (emergency only)

If you see a real attack in CF Analytics → Security:
1. Go to Security → Settings → **Under Attack Mode: ON**
2. Every visitor gets a 5-second JS challenge
3. Turn off within hours — it kills SEO and conversion
4. Post-incident, write a CF Custom Rule to block the specific pattern, then turn UAM off

---

## Phase 2 — Vercel Firewall (P1, this week)

Vercel Firewall is configured **via the Vercel dashboard or REST API**, not `vercel.json`. The headers in `vercel.json` are static security headers (already set).

### 2.1 Per-project rules

For each project (`nebutra-web`, `nebutra-api-gateway`, `nebutra-landing`):

Project → Firewall → Custom Rules. Add:

| # | Name | Condition | Action |
|---|------|-----------|--------|
| 1 | block-known-scanners | `request.user_agent contains` any of `["sqlmap", "nikto", "masscan", "zgrab", "nuclei"]` | **Deny** |
| 2 | challenge-rapid-write | `request.path starts_with "/api"` AND `request.method in ["POST","PUT","DELETE","PATCH"]` AND `rate > 60/min` | **Challenge** |
| 3 | block-non-allowlisted-ip-prod-admin | `request.path starts_with "/admin"` AND `ip.geo.country not in ["US","CA","GB","DE","JP","SG","HK","TW"]` | **Deny** |
| 4 | challenge-suspicious-headers | `request.headers.accept_language is missing` OR `request.headers.user_agent is missing` | **Challenge** |
| 5 | rate-limit-auth-endpoints | `request.path matches "^/api/auth/(sign-in\|sign-up\|reset-password)"` AND `rate > 10/min per ip` | **Challenge** |

> Sync via Terraform: see `vercel_firewall_config` resource in the [vercel-terraform-provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs/resources/firewall_config). Recommended once rules stabilize.

### 2.2 Attack Challenge Mode

Enable when under attack:
```bash
vercel firewall attack-mode on  --token=$VERCEL_TOKEN
vercel firewall attack-mode off --token=$VERCEL_TOKEN
```

### 2.3 Bot filtering

Project → Firewall → **Bot Filter**: ON (Vercel's heuristic, complements CF Bot Fight)

---

## Phase 3 — Application-layer (P1, this week)

Already in code — **verify deployment**:

- [ ] `backends/gateway`: Hono `cors()` allowlist (NOT `*`) — ✅ done in `src/index.ts:140`
- [ ] `backends/gateway`: `secureHeaders()` middleware — ✅ done in `src/index.ts:91`
- [ ] `backends/gateway`: `bodyLimit(1MB)` — ✅ done
- [ ] Both apps: HSTS via `vercel.json` — ✅ done in this PR
- [ ] `packages/rate-limit`: per-tenant + per-IP limits — verify wired into all write routes
- [ ] `packages/captcha`: Turnstile server verification — pending finish

---

## Verification

```bash
# 1. CF in front?
curl -sI https://nebutra.com | grep -i 'cf-ray\|server'
# Expected: cf-ray header present, server: cloudflare

# 2. HSTS active?
curl -sI https://app.nebutra.com | grep -i 'strict-transport'
# Expected: max-age=63072000; includeSubDomains; preload

# 3. CORS dynamic (not '*')?
curl -sI -X OPTIONS https://api.nebutra.com/v1/health \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET" | grep -i 'access-control-allow-origin'
# Expected: NO header (origin rejected by Hono allowlist)

curl -sI -X OPTIONS https://api.nebutra.com/v1/health \
  -H "Origin: https://app.nebutra.com" \
  -H "Access-Control-Request-Method: GET" | grep -i 'access-control-allow-origin'
# Expected: access-control-allow-origin: https://app.nebutra.com

# 4. Rate limit working?
for i in $(seq 1 200); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.nebutra.com/v1/auth/sign-in \
    -d '{"email":"x@y.z","password":"z"}'
done | sort | uniq -c
# Expected: ~10–60 200/401, then 429 (Hono rate-limit) and/or 403 (Vercel/CF)

# 5. HSTS preload eligibility
curl -sI https://nebutra.com | grep -i 'strict-transport'
# Then submit at https://hstspreload.org/?domain=nebutra.com
```

---

## Cost summary

| Layer | Plan | Monthly | What you get |
|-------|------|---------|--------------|
| Cloudflare | Free | $0 | Unlimited DDoS, Bot Fight basic, 1 WAF managed rule, 1 rate-limit rule, Turnstile |
| Cloudflare | Pro | $20 | Image optim, enhanced WAF, Super Bot Fight, more rate rules |
| Vercel | Pro | $20/seat | Firewall custom rules included, Attack Challenge Mode |
| Vercel | Enterprise | quote | DDoS Mitigation, Enterprise WAF, dedicated edge |

**Recommendation**: Start CF Free + Vercel Pro. Upgrade CF to Pro when traffic > 1M req/day or you need image optim.

---

## Incident playbook

**Symptom: traffic spike, latency up, 5xx rising**

1. CF Dashboard → Analytics → Security → check L7 attack indicator
2. If attack confirmed:
   - CF: **Under Attack Mode ON**
   - Vercel: `vercel firewall attack-mode on`
3. Identify pattern (path, ASN, country, UA) in CF Logs / Vercel Observability
4. Write **specific CF Custom Rule** blocking the pattern
5. Turn off UAM once specific rule is in place
6. Post-incident: write a Custom Rule template, add to this runbook

**Symptom: legitimate users blocked**

1. Check CF Firewall Events → look for false positives
2. Add **Skip rule** above the blocking rule (e.g., skip for known partner IPs)
3. Lower Security Level if too aggressive

---

## What this runbook does NOT cover (separate docs)

- Application auth & MFA — see `apps/web` Clerk config
- LLM abuse rate-limiting (token-based) — see `packages/agents` + `packages/metering`
- SOC 2 / compliance — pending Vanta engagement
- Secrets rotation — see `packages/vault` README
