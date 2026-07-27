# License History

This page records every licensing change to Nebutra-Sailor and what it means
for code you already have. It exists so that anyone doing legal due diligence
can answer "what license applies to the version I depend on?" without reading
git history.

## Current

| Surface | License | Since |
| --- | --- | --- |
| This repository (apps, spine packages, templates, infra) | **FSL-1.1-ALv2** — converts to Apache-2.0 two years after each version's release | 2026-07-26 |
| Published npm packages (`@nebutra/*`, `nebutra`, `create-sailor`) | **MIT** | Unchanged since first publication |

## Changes

### 2026-07-26 — Repository: AGPL-3.0-only → FSL-1.1-ALv2

**What changed.** The repository license moved from the GNU Affero General
Public License v3.0 to the [Functional Source License](https://fsl.software),
version 1.1, with Apache-2.0 as the future license.

**Why.** AGPL's network-copyleft clause is rejected by default in most
corporate legal reviews, which blocked adoption by exactly the teams the
project is built for. The only use we actually need to restrict is someone
offering a competing hosted substitute for Sailor itself. FSL restricts that
one case and permits everything else — internal use, closed-source commercial
products, client work, education, research — with no copyleft obligation.

**What it means for you.**

- Building a commercial product on Sailor: **allowed, no copyleft, no fee.**
- Using Sailor inside your company: **allowed.**
- Using Sailor to deliver client projects: **explicitly allowed** (FSL
  Permitted Purpose 4 covers professional services).
- Reselling Sailor itself, or launching a hosted service that substitutes for
  it: **not allowed** until that version's Apache-2.0 conversion date.
- Every version converts to **Apache-2.0 two years after its release date**, and
  that grant is irrevocable.

**Versions released before 2026-07-26 remain available under AGPL-3.0-only.**
That grant is irrevocable and we cannot withdraw it. The historical license
text is preserved verbatim at
[`LICENSE-AGPL-3.0-historical.txt`](./LICENSE-AGPL-3.0-historical.txt). If you
prefer AGPL terms, you may continue to use any commit up to and including the
last AGPL-licensed commit under AGPL-3.0-only.

**Published npm packages were never AGPL.** Every `@nebutra/*` package, plus
`nebutra` and `create-sailor`, has been published under MIT since first
release. This licensing change does not affect them, and MIT grants already
made cannot be revoked.

**Retired: the scaffold-marker signing apparatus.** The signed
`.nebutra/scaffold-meta.json` marker existed to decide which licence applied to
a scaffolded project — its presence and a valid HMAC were what conferred the
Independent Developer tier instead of AGPL copyleft. With scaffolded projects
MIT unconditionally, the marker gated nothing, so the cryptography protected
nothing. The signing-key registry, the `nebutra license verify` subcommand, the
public `/api/license/verify` endpoint, and the key-rotation runbook were all
removed; the endpoint had no callers at all.

The marker file itself survives as an unsigned provenance breadcrumb — which
CLI version produced the project, and when — useful for support triage.
Deleting it costs a project no rights. Markers written by create-sailor
<= 1.8.4 still carry `signature`, `nonce` and `signingKeyId`; those fields are
ignored, not rejected.

**Retired tiers.** The change made two constructs unnecessary, and both were
removed:

- The *Independent Developer License* — a free-but-registered tier granting a
  copyleft exception. FSL grants those rights to everyone with no registration,
  so the tier no longer has anything to grant.
- The *Startup Commercial License ($799/year)* — it sold permission to use the
  code closed-source. FSL already permits that at no cost. Paid tiers now sell
  support, SLAs, indemnification, compliance paperwork, and trademark rights.
  See [`LICENSE-COMMERCIAL.md`](../../LICENSE-COMMERCIAL.md).

Anyone who purchased a Startup license before this date keeps everything they
paid for and is automatically moved to the equivalent support tier for the
remainder of their term at no additional cost. Contact `legal@nebutra.com`.

## Relicensing authority

Copyright in this repository is held by Wuxi Nebutra Intelligence Technology
Co., Ltd. External contributions are accepted under the
[Contributor License Agreement](./CLA.md), which grants the company the right
to license contributions under the project license and any future license.
This is what makes relicensing possible without contacting every contributor.

## Questions

`legal@nebutra.com` — or see the [Licensing FAQ](./licensing-faq.md).
