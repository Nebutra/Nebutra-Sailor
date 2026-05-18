# Retroactive CLA outreach to historical contributors

> **TODO LEGAL:** the email template below has **not** been reviewed by
> counsel. Before sending to a real contributor, ask a qualified IP
> lawyer to review (a) the relicensing-permission language, (b) the
> "remove your commits" fallback path (is that the right phrasing under
> AGPL §13?), (c) the jurisdiction reference in `CLA.md`.

---

## Why this matters

The CLA bot (see [`contributing-with-cla.md`](./contributing-with-cla.md))
covers **future** contributions. Every commit landed in `Nebutra-Sailor`
before the bot went live still belongs — copyright-wise — to its author.

Two consequences:

1. **The dual-license model is legally fragile.** We ship the Independent
   Developer License to end-users who scaffold via `create-sailor`, but
   that license relicenses code we may not have the right to relicense
   (because external contributors never agreed to it).
2. **A future Commercial License is even more fragile.** Commercial
   redistribution of code held under exclusive copyright by an external
   contributor is a clear infringement.

The fix is **retroactive CLA signature**. We ask each historical
external contributor — see
[`historical-contributors.md`](./historical-contributors.md) — to either:

- (a) sign the same CLA the bot now enforces, retroactively covering
      their past commits, **or**
- (b) decline, in which case we remove or rewrite the affected commits
      and continue under the AGPL-only fallback.

This is the same pattern the Chromium, MongoDB, and OpenSSL projects
have used during license-model migrations.

---

## Workflow

1. Run `pnpm legal:contributors` to refresh
   [`historical-contributors.md`](./historical-contributors.md).
2. For each row marked `☐` in the "CLA signed?" column, send the email
   below to the contributor (use the email column).
3. When they reply with consent (or sign the CLA via the bot on a fresh
   PR), flip `☐` → `☑` and commit the change.
4. If they decline, flip `☐` → `—` and open a follow-up issue tagged
   `legal/retire-contribution` to remove or rewrite their commits.
5. When all rows are resolved, this file can be archived.

---

## Email template

Copy-paste, replace `{{NAME}}`, `{{COMMIT_COUNT}}`, `{{FIRST_COMMIT_DATE}}`,
and send from `legal@nebutra.com`.

> **TODO LEGAL:** counsel to review wording — especially the "removal"
> sentence (we want to be careful not to imply we're already in breach).

```
Subject: Quick licensing question about your Nebutra-Sailor contribution

Hi {{NAME}},

Thanks again for contributing to Nebutra-Sailor — you've landed
{{COMMIT_COUNT}} commit(s) since {{FIRST_COMMIT_DATE}} and we appreciate
the help.

We're tightening up the project's licensing as we expand the
dual-license model (AGPL upstream + a permissive Independent Developer
License for individual SaaS builders + a Commercial License for
enterprise customers). To keep your past contributions covered cleanly,
we'd like to ask you to sign our Contributor License Agreement, which
applies retroactively to the commits you've already landed:

    https://github.com/Nebutra/Nebutra-Sailor/blob/main/docs/legal/CLA.md

Two-minute summary: you keep copyright in your work; you grant us the
right to relicense your contributions under our current and future
license tiers. No money changes hands; no exclusivity. The same pattern
is used by Apache, Google, MongoDB, and Elastic.

To sign: reply to this email with the sentence

    "I have read the Nebutra-Sailor CLA and I retroactively agree to its
    terms for all commits I have authored to the Nebutra/Nebutra-Sailor
    repository as of today's date."

Alternatively, open any new PR to the repo — our CLA bot will ask you
to sign there, and signing once covers both past and future commits.

If you'd rather not sign, that's completely fine. Just reply "no" and
we'll work with you to either rewrite or remove the affected commits
under the upstream AGPL-3.0 grant — your contributions would stay in
git history but not be redistributed under the new permissive tiers.

Either way, thanks for the contribution. Happy to answer any questions.

— The Nebutra team
   legal@nebutra.com
```

---

## Tracking

| Field | Where |
|-------|-------|
| Outreach list | [`historical-contributors.md`](./historical-contributors.md) |
| CLA text | [`CLA.md`](./CLA.md) |
| Future-contributor workflow | [`contributing-with-cla.md`](./contributing-with-cla.md) |
| Bot config | [`.github/workflows/cla.yml`](../../.github/workflows/cla.yml) |
| Email log | `legal@nebutra.com` inbox (not committed) |
