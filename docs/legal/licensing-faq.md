# Licensing FAQ — Nebutra-Sailor

> **Not legal advice.** This FAQ is explanatory. Where it and the
> [LICENSE](../../LICENSE) file conflict, the LICENSE file governs.
> Binding answers: [legal@nebutra.com](mailto:legal@nebutra.com).

Last updated: 2026-07-26.

---

## "What does it cost to build a commercial product on this?"

**Nothing.**

No fee, no licence key, no registration, no revenue threshold, no headcount
threshold, no copyleft obligation. Build a closed-source product, sell it,
keep the money.

This changed on 2026-07-26. If you previously read that you needed an
Independent Developer License or a $799/year Startup License, that is no
longer true — both tiers were retired. See
[License History](./license-history.md).

---

## "Then what am I actually bound by?"

Two licences, depending on how you obtained the code.

| How you got it | Licence | Practical effect |
| --- | --- | --- |
| `npm install @nebutra/…`, `npx create-sailor` | **MIT** | Do anything. Keep the copyright notice. |
| Cloned or forked this repository | **FSL-1.1-ALv2** | Do anything except sell a Sailor substitute. Converts to Apache-2.0 two years after each release. |

Most people use both at once. That is fine and intended.

---

## "What is the one thing I can't do?"

Under FSL you may not make Sailor available to others in a commercial product
or service that:

1. substitutes for Sailor, or
2. substitutes for another product we offer built on Sailor, or
3. offers the same or substantially similar functionality.

**In one line: build products with Sailor, don't sell Sailor.**

The restriction expires. Every version becomes Apache-2.0 on the second
anniversary of its release, and that grant is made irrevocably in advance.

---

## "Is my SaaS a 'competing use'?"

Almost certainly not. The test is whether *your product substitutes for
Sailor* — not whether it is software, or a SaaS, or multi-tenant.

| What you're building | Competing use? |
| --- | --- |
| A CRM for dental clinics, built on Sailor | ❌ No |
| An AI writing tool, built on Sailor | ❌ No |
| An internal admin portal | ❌ No |
| A vertical SaaS in any industry | ❌ No |
| "SailorCloud — hosted Nebutra Sailor, $49/mo" | ✅ **Yes** |
| A rebranded SaaS-boilerplate product sold to developers | ✅ **Yes** |
| A developer platform pitched as "Sailor, but managed" | ✅ **Yes** |

The pattern: if your customers are buying *Sailor's* functionality rather than
*your product's* functionality, it is a competing use.

If your model does require competing use, it is negotiable — Enterprise
agreements can include a written competing-use waiver. Ask rather than guess.

---

## "Do I have to say 'Built with Nebutra-Sailor'?"

**No.** Attribution is appreciated and never required. The retired Independent
tier did require it; that requirement is gone.

You must retain existing copyright notices **if you redistribute Sailor's
source code**. That concerns redistributing the source, not shipping a product
built on it — your compiled application carries no such obligation.

---

## "Can I use it for client work / agency projects?"

**Yes, explicitly.** FSL Permitted Purpose 4 covers "professional services
that you provide to a licensee using the Software in accordance with these
Terms and Conditions."

Build client projects on Sailor and charge whatever you like. The client
receives the software under the same terms you did.

---

## "We're a 5,000-person company. Do we need a licence?"

**Not to use it.** Headcount and revenue are irrelevant now — those thresholds
belonged to the retired tiers.

You may still want an Enterprise agreement, for different reasons: indemnity,
a contractual SLA, a signed DPA, compliance documentation, or a named
counterparty your procurement process can point at. That is buying assurance,
not permission. See [LICENSE-COMMERCIAL.md](../../LICENSE-COMMERCIAL.md).

---

## "Internal-only use at a large company?"

No licence needed. Internal use is an explicit Permitted Purpose.

---

## "Can I fork it and keep my changes private?"

Yes. FSL has no copyleft clause, and no network-use trigger — that was the
AGPL clause, and it is gone. There is no obligation to publish modifications.

If you *redistribute the source* of your fork, the FSL terms travel with it and
you must retain copyright notices.

---

## "What if I'm already using it under AGPL?"

Versions released before 2026-07-26 remain available under AGPL-3.0-only, and
that grant is irrevocable. You may continue under AGPL if you prefer.

Almost nobody should. FSL is strictly more permissive for ordinary product
work — it removes the copyleft and network-disclosure obligations AGPL
imposed. Pulling a newer version moves you onto the better terms.

---

## "I paid for a Startup licence. What now?"

You keep the full value of your term, moved to the equivalent support tier at
no additional cost. Email `legal@nebutra.com` and we will confirm in writing.

The right you paid for — closed-source commercial use — is now free for
everyone. What you paid is being converted into support, which is the part
with ongoing value.

---

## "Is this open source?"

**The MIT packages: yes.** The 79 published `@nebutra/*` packages are
OSI-approved open source.

**The repository: no, not yet.** FSL is *source-available*, not OSI-approved
open source, because of the competing-use restriction. We will not call it
open source while that clause is live — that would be inaccurate, and you
would find out.

Each version becomes genuinely open source (Apache-2.0) on its second
anniversary.

---

## "Can I contribute while using it commercially?"

Yes. Contributions are covered by the [CLA](./CLA.md), which grants us a broad
licence to your contribution. You retain copyright. Contributing changes
nothing about your rights as a user.

---

## "What about just reading the source on GitHub?"

Reading, studying, and learning from the code carry no obligations
whatsoever. Non-commercial education and research are explicit Permitted
Purposes.

---

## "Why FSL rather than MIT or Apache for the whole repository?"

Because a two-year clock does something a permissive licence cannot: it stops
a hosted substitute appearing while the project is young, without imposing
anything on the people actually building products — which is everyone else.

A restriction that expires on a fixed date, with the conversion grant made
irrevocably in advance, is more honest than a permanent one. If we stop
maintaining the project, it becomes fully open source on schedule regardless.

---

## Still uncertain?

Email `legal@nebutra.com` with a short description of what you are building.
Plain-language answer, no sales call. If the answer is "you need nothing from
us", we will say so.
