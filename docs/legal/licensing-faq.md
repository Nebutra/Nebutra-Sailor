# Licensing FAQ — Nebutra-Sailor

> **Status: TODO LEGAL.** This FAQ is the engineering team's best-effort
> interpretation of the tier thresholds. It must be reviewed by counsel before
> being treated as authoritative guidance. For binding answers, contact
> [licensing@nebutra.com](mailto:licensing@nebutra.com).

Last updated: 2026-05-15.

This document covers edge cases for the three Nebutra-Sailor commercial tiers:

| Tier         | Eligibility                                          | Price        | Document                                                                 |
|--------------|------------------------------------------------------|--------------|--------------------------------------------------------------------------|
| Independent  | ≤ 1 FTE, < $1M ARR                                   | Free         | [`LICENSE-INDEPENDENT.md`](../../packages/ops/create-sailor/templates/LICENSE-INDEPENDENT.md) (CLI-emitted) |
| Startup      | 2–50 FTE, any revenue                                | $799/year    | [`LICENSE-COMMERCIAL.md`](../../LICENSE-COMMERCIAL.md) §2                |
| Enterprise   | 50+ FTE, ≥ $1M ARR, or white-label / SLA needs       | Custom       | [`LICENSE-COMMERCIAL.md`](../../LICENSE-COMMERCIAL.md) §3                |

---

## "What is an FTE?"

A full-time equivalent is one person working full-time hours (typically ≥ 32
hours/week) on the product built with Nebutra-Sailor. The threshold counts
**people working on the product**, not your total headcount.

### Worked examples

- **Two co-founders, each 20 hours/week on the product, day jobs otherwise.**
  Combined effort = roughly 1 FTE. Independent tier eligible while combined
  product-effort stays at-or-below 1 FTE.
- **You + a part-time contractor doing 8 hours/week.**
  ≈ 1.2 FTE. Strictly speaking, above the Independent threshold; upgrade to
  Startup. The Independent license says "part-time contractors do not count"
  for occasional/short-engagement contractors, but a recurring 8-hour-per-week
  arrangement is sustained product work and should be counted.
- **You + a second co-founder who also works full-time on the product.**
  2 FTE. Startup tier required from day one.
- **You alone, 60 hours/week.**
  Still 1 FTE (an FTE is one person, regardless of overtime). Independent tier
  eligible.

When in doubt, count anyone whose ongoing weekly contribution to the product
is non-trivial.

---

## "Annual revenue — gross or net? Product-specific or total?"

The $1,000,000 USD threshold is **gross annual revenue derived from the
product built on Nebutra-Sailor**, measured over a trailing 12-month window.

- **Multiple unrelated businesses, one of which uses Nebutra-Sailor.**
  Only count revenue from the Nebutra-Sailor-derived product.
- **Single business with multiple products, one uses Nebutra-Sailor.**
  Only count revenue attributable to the Nebutra-Sailor-derived product.
- **Currency conversion.**
  Use the average exchange rate over the measurement window.
- **Pre-revenue / bootstrapping.**
  Zero revenue ≪ $1M; Independent tier eligible.

---

## "What happens if I cross the threshold mid-year?"

You have **30 days** from the point you cross either threshold (FTE > 1 or ARR
≥ $1M) to upgrade to the Startup tier. You do not need to retroactively pay
for the months before crossing; the Independent license remained valid for
that period.

If you cross the Startup threshold (FTE > 50 or you need white-label / SLA),
you have 30 days to negotiate Enterprise terms. Contact
[enterprise@nebutra.com](mailto:enterprise@nebutra.com) before the 30 days
expire to start the conversation — actual contract close can take longer.

---

## "What counts as 'a project' under the Independent license?"

One Independent license covers **one product or product line** under one legal
entity (you-the-individual or your OPC). Examples:

- One indie SaaS at `myapp.com` — one project. ✅
- A SaaS at `myapp.com` plus a free dev tool at `mytool.dev` you also make —
  treat as one project under one entity. ✅
- A SaaS at `myapp.com` and a separate consulting business where you scaffold
  client projects with `create-sailor` — **the client projects are separate
  products** and each needs its own license (or a Startup license that covers
  agency-style work; see below).
- Multiple sites that are all part of the same product offering (marketing
  site, app, admin dashboard, status page) — one project. ✅

If you scaffold projects on behalf of clients (agency / consultancy work), the
Independent tier does not cover that use case. You'll need Startup tier
licensing, and ideally each client's project carries its own commercial
license. Contact licensing@nebutra.com for agency-pricing guidance — this is
not formally a separate tier yet.

---

## "Internal-only use at a large company — does that need a commercial license?"

Yes, if your company has > 1 FTE working on the internal tool or ≥ $1M ARR as
a company. Internal tooling is still a "product built on Nebutra-Sailor" for
licensing purposes — the AGPL network-copyleft trigger doesn't apply for
internal-only use, but the *commercial license* requirement does, because
you've still received the source-code grant.

In practice, most companies use the Startup tier ($799/year) for internal
tools until they outgrow 50 FTE.

---

## "I forked the GitHub repo directly without using `create-sailor`. What license applies?"

The upstream repository is **AGPL-3.0**. Direct forks inherit AGPL, including
the network-copyleft clause (Section 13): if you offer the modified software
as a network service, you must make the modified source available to users.

To get the no-copyleft permissions of the Independent / Startup / Enterprise
tiers, you must **either**:

1. **Scaffold a fresh project with `create-sailor`** — the CLI emits the
   Independent License and a signed `.nebutra/scaffold-meta.json` marker that
   distinguishes the two grants legally; or
2. **Purchase a Startup or Enterprise commercial license** at
   [nebutra.com/get-license](https://nebutra.com/get-license), which grants
   the same no-copyleft permissions to your existing fork.

The presence or absence of `.nebutra/scaffold-meta.json` at the repo root is
the legal marker that distinguishes the two paths.

---

## "What about reading the source on GitHub?"

Reading, studying, and learning from the GitHub source is unrestricted — the
source is public. The license restrictions apply to **distribution and
deployment** of derivative works, not reading. You don't need any license to
browse the code on github.com.

---

## "Can I contribute code while using the Independent license?"

Yes — and we encourage it. Contributions to the upstream repository are
governed by the Contributor License Agreement in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md). Your contribution grants Nebutra
Technologies a broad license to use, modify, and redistribute it (so we can
keep offering the dual-license model). You retain copyright.

---

## Still uncertain?

Email [licensing@nebutra.com](mailto:licensing@nebutra.com) with a one-paragraph
description of your situation. We typically reply within two business days. We
would much rather you ask than guess wrong.
