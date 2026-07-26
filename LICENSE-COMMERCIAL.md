# Nebutra-Sailor Commercial Terms

## Preamble

**Using Nebutra-Sailor to build a commercial product is free. There is no fee,
no registration, and no copyleft obligation.**

That is not a limited-time offer or a tier — it is what the code licenses
already grant:

- Published npm packages (`@nebutra/*`, `nebutra`, `create-sailor`) are **MIT**.
- This repository is **FSL-1.1-ALv2**, which permits every use except offering
  a commercial product or service that competes with Sailor itself, and which
  converts irrevocably to **Apache-2.0** two years after each release.

So the paid tiers below do not sell permission to use the software. They sell
the things a code licence cannot give you: **a support commitment, a response
SLA, indemnification, compliance paperwork, and trademark rights.**

If you do not need those, stop reading and go build. You already have
everything you need.

> **Superseded tiers.** Earlier versions of this document defined an
> *Independent Developer License* (free, but requiring registration and
> attribution) and a *Startup Commercial License* ($799/year, granting
> closed-source use). Both sold or gated rights that are now granted to
> everyone at no cost, so both were retired on 2026-07-26. Existing Startup
> licensees keep the full value of their term — see
> [License History](./docs/legal/license-history.md).

---

## Section 0 — What you never have to pay for

Explicitly, and for the avoidance of doubt, all of the following are free and
require no licence key, no registration, and no notice to us:

| Use case | Allowed? |
| --- | --- |
| Build a closed-source commercial SaaS on Sailor | ✅ Free |
| Ship it to paying customers | ✅ Free |
| Use Sailor inside your company, at any headcount | ✅ Free |
| Use Sailor to deliver client projects and charge for them | ✅ Free — FSL Permitted Purpose 4 |
| Modify, fork, and keep your changes private | ✅ Free |
| Use it at a company with 10,000 employees | ✅ Free |
| Use it in a funded startup, at any revenue | ✅ Free |
| Remove nothing, credit nobody | ✅ Free — attribution is appreciated, never required |

There is exactly **one** thing the code licence does not permit: shipping a
commercial product or service that substitutes for Sailor itself (a hosted
"Sailor-as-a-service", or a repackaged competing platform baseline). That
restriction expires two years after each release, when that version becomes
Apache-2.0. See [Section 4](#section-4--what-the-code-licence-does-not-grant).

---

## Section 1 — Community (free)

**$0 · no registration · no expiry**

- Full use of the source and all published packages under the terms above
- Public issue tracker and GitHub Discussions
- Community Discord
- Public documentation and release notes
- Security advisories via the public advisory feed

**Support is best-effort.** We read every issue. We do not promise to respond
to any particular one, and there is no timeline. If you need a promise, that
is what Section 2 is for.

---

## Section 2 — Team support subscription

**$2,000 / year per company · annual term**

Everything in Community, plus a commitment from us:

- ✅ **Private support channel** (email + a shared Slack or Discord channel)
- ✅ **Two business-day first response** on any question, guaranteed
- ✅ **Prioritised bug triage** — your reports enter the queue ahead of
  community issues
- ✅ **Upgrade assistance** — help planning and executing major-version upgrades
- ✅ **Advance notice of breaking changes** before they land on `main`
- ✅ Named contact for your account

**No buy-out option.** This is a support commitment, and a commitment only
means something while it is live. Buying a perpetual licence to a promise
would be selling you nothing. The code itself is already yours, permanently
and for free.

**Purchase:** [nebutra.com/get-license](https://nebutra.com/get-license)

---

## Section 3 — Enterprise

**From $30,000 / year · annual or multi-year**

For organisations whose procurement, legal, or security review requires a
counterparty who signs. Everything in Team, plus:

### Contractual commitments

- ✅ **Response SLA** — 4 business hours standard, 1 hour for production-down
  (severity definitions in the order form)
- ✅ **Security patch commitment** — Critical/High vulnerabilities patched and
  released within a contractually bound window
- ✅ **Indemnification** against third-party IP claims arising from the
  software as delivered — see [Indemnification](./docs/legal/indemnification.md)
- ✅ **Long-term support branch** — security backports to your pinned major
  version beyond the community support window

### Procurement & compliance

- ✅ **Signed DPA** — see [DPA template](./docs/legal/dpa-template.md)
- ✅ **Compliance pack** — control documentation, subprocessor list, security
  questionnaire responses, penetration-test summary — see
  [Security & Compliance](./docs/legal/security-compliance.md)
- ✅ **Source escrow / continuity undertaking** — see
  [Business Continuity](./docs/legal/business-continuity.md)
- ✅ Custom MSA, or execution against your paper

### Product rights

- ✅ **Trademark and white-label licence** — present the platform under your own
  brand and remove Nebutra attribution. This is the one product right that is
  genuinely reserved, because the code licence explicitly grants no trademark
  rights. See [TRADEMARK.md](./TRADEMARK.md).
- ✅ **Competing-use waiver** — a written waiver of the FSL Competing Use
  restriction, if your business model requires it
- ✅ Private-deployment engineering support (air-gapped, on-premise, sovereign
  cloud)
- ✅ Roadmap input and pre-release access

**Pricing** is quoted per engagement based on scope of SLA, deployment model,
and whether trademark rights are included. Multi-year and multi-division
agreements available.

**Contact:** [sales@nebutra.com](mailto:sales@nebutra.com) · typical
negotiation 2–4 weeks.

---

## Comparison

| | Community | Team | Enterprise |
| --- | --- | --- | --- |
| **Price** | $0 | $2,000/yr | from $30,000/yr |
| Commercial use, closed source | ✅ | ✅ | ✅ |
| All source and packages | ✅ | ✅ | ✅ |
| Registration required | No | — | — |
| Attribution required | No | No | No |
| First-response guarantee | ✗ | 2 business days | 4 business hours |
| Production-down SLA | ✗ | ✗ | 1 hour |
| Private support channel | ✗ | ✅ | ✅ |
| Security patch commitment | ✗ | ✗ | ✅ contractual |
| Long-term support branch | ✗ | ✗ | ✅ |
| Indemnification | ✗ | ✗ | ✅ |
| Signed DPA / compliance pack | ✗ | ✗ | ✅ |
| Continuity undertaking | ✗ | ✗ | ✅ |
| Trademark / white-label rights | ✗ | ✗ | ✅ |
| Competing-use waiver | ✗ | ✗ | ✅ negotiable |

---

## Section 4 — What the code licence does not grant

Two things are outside the free grant. Both are narrow, and neither affects
ordinary product development.

### 4.1 Competing use (expires)

FSL-1.1-ALv2 does not permit making Sailor available to others in a commercial
product or service that substitutes for Sailor, substitutes for another
product we offer built on Sailor, or offers substantially similar
functionality. In plain terms: **build products with Sailor, don't sell Sailor.**

This restriction is time-limited. Each version becomes Apache-2.0 two years
after its release, at which point the restriction ends for that version and
cannot be reimposed.

If your model requires competing use before then, it is negotiable — that is
the competing-use waiver in Section 3, not a refusal.

### 4.2 Trademarks (does not expire)

Neither FSL-1.1-ALv2 nor Apache-2.0 grants trademark rights. You may not use
the Nebutra or Nebutra Sailor names, logos, or brand assets to identify your
product, or imply endorsement or partnership. Naming your own product
something unrelated and building it on Sailor requires no permission at all.

See [TRADEMARK.md](./TRADEMARK.md) and
[BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md).

### 4.3 Copyright notices

Under the FSL Redistribution clause, if you redistribute copies,
modifications, or derivatives of the source, you must include the licence
terms and retain existing copyright notices. This applies to redistributing
*Sailor's source*; it does not apply to shipping a compiled product built on
it.

---

## Section 5 — Contributor License Agreement

All contributors agree to the [Contributor License Agreement](./docs/legal/CLA.md),
summarised in [CONTRIBUTING.md](./CONTRIBUTING.md).

By opening a pull request or otherwise contributing code, documentation, or
translations, you grant Wuxi Nebutra Intelligence Technology Co., Ltd. a
perpetual, irrevocable, worldwide, royalty-free licence to use, reproduce,
modify, sublicense, and distribute your contributions under the project
licence and any future licence.

This is what allows us to:

- publish packages under MIT while the repository is FSL-1.1-ALv2;
- honour the Apache-2.0 future-licence grant on your behalf;
- relicense if a future change is in users' interest — as happened on
  2026-07-26.

**You retain copyright in your contributions.** We ask only for a broad
licence.

For substantial contributions a separate CLA signature may be requested.

---

## Section 6 — Term, termination, and governing law

- Paid subscriptions run for the term stated on the order form and renew only
  by agreement.
- Termination of a paid subscription ends the support, SLA, indemnity, and
  trademark rights it conferred. **It does not affect your right to keep using
  the software** — that right comes from the code licence, not from payment,
  and it does not lapse.
- Breach of the trademark or competing-use terms may result in termination of
  the rights granted under those specific clauses.
- Governing law and venue are specified in the applicable order form or master
  agreement. Absent an executed agreement, the seat of the licensor applies.

---

## Disclaimer

**These commercial terms are provided as-is and are a plain-language summary,
not a substitute for legal review by your own counsel.** Where these terms and
an executed order form or master agreement conflict, the executed agreement
governs. Where these terms and the [LICENSE](./LICENSE) file appear to
conflict as to what the code licence grants, the LICENSE file governs.

Questions about which tier fits: [legal@nebutra.com](mailto:legal@nebutra.com).

---

**Copyright © 2026 Wuxi Nebutra Intelligence Technology Co., Ltd.**

*Last updated: 2026-07-26*
