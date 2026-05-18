# Contributing with the CLA

Nebutra-Sailor uses a Contributor License Agreement (CLA) to enable our
dual-license model — AGPL-3.0 for the upstream repo + the Independent
Developer License for `create-sailor`-scaffolded projects + future
commercial licenses for enterprise customers.

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

> **TODO LEGAL:** the corporate-CLA template is not yet drafted. Counsel
> to produce one if/when we have a corporate contributor.

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

Without a CLA, every contributor retains exclusive copyright over their
commits. That would mean:

- We **cannot** offer a permissive Independent Developer License to
  end-users (because we'd be relicensing code we don't own the right to
  relicense).
- We **cannot** sell a Commercial License to an enterprise without
  obtaining individual consent from every past contributor.

The CLA grants Nebutra Technologies the right to **relicense** your
contributions under multiple licenses simultaneously — you keep your
copyright; we get the right to distribute. It is the same legal pattern
used by Apache Software Foundation, Linux Foundation, Google, Meta,
MongoDB, and Elastic.

---

## Where to ask questions

- **About the CLA's content**: open an issue tagged `legal` or email
  `legal@nebutra.com`.
- **About the bot mechanics**: see
  [`.github/workflows/cla.yml`](../../.github/workflows/cla.yml).
- **About the upstream AGPL**: see [`LICENSE`](../../LICENSE).
