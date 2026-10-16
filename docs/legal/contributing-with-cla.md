# Contributing with the CLA

> **Status: DRAFT — not legal advice.**
>
> | Field | Value |
> |-------|-------|
> | **Owner** | Nebutra Legal (interim: engineering @nebutra.com) |
> | **As of** | 2026-07-24 |
> | **Counsel review** | Pending |
>
> Process guide for contributors. Binding terms live in [`CLA.md`](./CLA.md).

Nebutra-Sailor is open source under the Apache License 2.0. Contributions
are accepted under Apache-2.0 — section 5 of the licence makes inbound equal
outbound. Substantial contributions may additionally be asked to sign a
Contributor License Agreement (CLA), so the project can keep offering
enterprise agreements and relicense in future without tracking down every
past contributor.

**Read the agreement:** [`CLA.md`](./CLA.md)

---

## You only sign once

The CLA bot (powered by [cla-assistant.io](https://cla-assistant.io))
binds your signature to your GitHub identity. After you sign once, every
future PR you open against `Nebutra/Nebutra-Sailor` (or any other repo
under the same CLA) is automatically green.

---

## What the bot does

1. You open a PR.
2. Within ~30s, the bot adds a comment with a link to
   [`docs/legal/CLA.md`](./CLA.md) and instructions.
3. The bot also adds a **check** to your PR named `license/cla` that
   stays *pending* until you sign.

## How to sign

Reply to the bot's comment with this **exact** sentence — copy-paste it:

```
I have read the CLA Document and I hereby sign the CLA
```

The bot detects the sentence, stores your signature on the
`cla-signatures` branch (you don't see this branch in normal browsing —
it's metadata only), and flips the `license/cla` check to green.

That's it. Future PRs are pre-signed.

---

## Special cases

### I'm contributing on behalf of my employer

If your employer owns the IP in code you write (most US employment
contracts have this clause), please either:

- Get explicit written permission from your employer (forwarded to
  `legal@nebutra.com`), **or**
- Have your employer sign a Corporate CLA. Contact us at
  `legal@nebutra.com` for the corporate form.

> **Draft note (Owner: Nebutra Legal · as of 2026-07-24):** the
> corporate-CLA template is not yet drafted. Counsel to produce one
> if/when we have a corporate contributor.

### I'm a bot / automated dependency-update PR

Bots in the workflow's `allowlist` (`dependabot`, `github-actions`,
`renovate`, `lefthook-bot`) are never asked to sign. If you maintain a
bot account that should be on the allowlist, open an issue.

### I want to revoke my signature

Open an issue tagged `legal` or email `legal@nebutra.com`. We will
remove your entry from `cla-signatures.json` and may need to remove or
relicense your past contributions — see the project owner's outreach in
[`historical-contributors-outreach.md`](./historical-contributors-outreach.md)
for the same tradeoff retroactive contributors face.

---

## Why we need this

Apache-2.0 §5 already licenses your contribution to everyone under
Apache-2.0. The CLA adds what that section cannot. Without it:

- We **cannot** relicense when it is in users' interest — as happened on
  2026-07-26 (AGPL-3.0 → FSL-1.1-ALv2) and on 2026-10-16 (→ Apache-2.0) —
  without obtaining individual consent from every past contributor.
- We **cannot** sign an enterprise agreement carrying indemnification
  without owning the rights we are indemnifying.

The CLA grants Nebutra Technologies the right to **relicense** your
contributions — you keep your
copyright; we get the right to distribute. It is the same legal pattern
used by Apache Software Foundation, Linux Foundation, Google, Meta,
MongoDB, and Elastic.

---

## Where to ask questions

- **About the CLA's content**: open an issue tagged `legal` or email
  `legal@nebutra.com`.
- **About the bot mechanics**: see
  [`.github/workflows/cla.yml`](../../.github/workflows/cla.yml).
- **About the project licence (Apache-2.0)**: see [`LICENSE`](../../LICENSE)
  and [`NOTICE`](../../NOTICE).
