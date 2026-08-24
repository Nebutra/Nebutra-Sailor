# Bot / crawler policy matrix

**Visibility:** G18 (training-vs-RAG), G21 (robots allow-all).  
**Last updated:** 2026-07-27

## Intent

Separate three classes of automated agents:

| Class | Goal | Marketing policy | Docs policy |
| --- | --- | --- | --- |
| **Search** (Googlebot, Bingbot, …) | Index public pages | Allow product/marketing paths; disallow app chrome (`/api/`, `/sign-in`, …) | Allow public docs |
| **RAG / answer** (GPTBot, ClaudeBot, …) | Ground answers in public product copy | Allow `/`, `/blog/`, `/features`, `/pricing` only | Prefer `/llms.txt` + docs |
| **Training scrapers** (aggressive mirrors) | Bulk train | No extra privilege beyond Search rules; rate-limit at edge (G20/G28) | Same |

## Canonical files

| Surface | File |
| --- | --- |
| Marketing robots | `apps/landing/src/app/robots.ts` |
| Marketing LLM map | `apps/landing/src/app/llms.txt/route.ts` → `/llms.txt` |
| Forge robots | `apps/forge/src/app/robots.ts` |
| Forge sitemap | `apps/forge/src/app/sitemap.ts` → `/sitemap.xml` |
| Forge LLM map | `apps/forge/src/app/llms.txt/route.ts` → `/llms.txt` |
| Docs robots | `apps/sailor-docs/src/app/robots.ts` |
| Docs LLM map | `apps/sailor-docs/src/app/llms.txt/route.ts` |

## Marketing `robots.ts` rules (summary)

1. `user-agent: *` — allow `/`; disallow `/api/`, `/_next/`, auth and settings chrome.
2. Named AI bots (`GPTBot`, `ClaudeBot`, …) — **narrow allow list** (home, blog, features, pricing). They do not get the full site.
3. Sitemap: `/sitemap.xml` (sharded index).

## Citation

LLM clients should prefer `/llms.txt` over scraping HTML. Citation policy is stated in that file.

## Edge rate limits

Per-bot differentiation at the CDN (G20) is separate from robots.txt. Robots is advisory; WAF/rate-limit is enforcement.
