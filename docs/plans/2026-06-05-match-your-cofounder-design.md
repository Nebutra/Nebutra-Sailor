# Match Your Cofounder — UIUX Design

**Date:** 2026-06-05 · **Status:** Approved concept (by user) — implementation plan to follow.
**One line:** Turn a one-person company (OPC) into a real team by matching it with a
complementary cofounder — a serious, context-rich "Tinder for startups" that matches
*compiled companies*, not faces.

> Original design — there is no existing model to copy (Tinder / AngelList / YC cofounder
> matching are all a different shape). Build from Nebutra's own asset: every founder has a
> Startup-OS-compiled `CompanyContext`.

---

## 1. What it is (dual identity)

"Match your cofounder" is ONE surface with two faces:
1. **The team entry** — the OPC's path to becoming a multi-person company. It *replaces*
   "create a team": you don't spin up an empty team, you first find the right cofounder.
2. **Tinder-for-startups** — a swipe-decided discovery surface for candidate cofounders.

It also fixes the tenant naming (separate but related):
- Individual tenant → **"One-Person Company" / 一人公司 (EN: OPC)** (was "Personal / 个人").
- The "create a team" action → **"Match your cofounder"**.

## 2. Core insight (why we don't copy Tinder)

Choosing a cofounder is a **high-stakes, high-context** decision. Dating apps match on a
photo + bio. Nebutra matches on the **compiled company**: each founder already has a
`CompanyContext` (thesis, arena, stage), complementary skill/role signals, and shipped
artifacts from Startup OS. We match *company-to-company, gap-to-complement* — the data
nobody else has. The swipe *mechanic* is borrowed; the *substance* is ours.

## 3. The card — a founder × company, not a face

Each Discover card is a condensed OPC:
- **Top:** founder archetype (Technical / GTM / Product / Design / Ops) + a **trust badge**
  (real Nebutra account, has a compiled company, optionally license-verified).
- **Middle:** their **one-line thesis + arena + stage** (straight from their CompanyContext).
- **Complementarity bar:** "Brings **X**, fills the **Y** you're missing" — computed by the
  `cofounder-match` engine from role/skill/arena gaps relative to *your* OPC.
- **Bottom:** **traction signals** — artifacts shipped, MVP live?, demand-map strength.

No résumés, no headshakes-as-content: the card answers "would this company + this person
complete mine?".

## 4. Decision actions (serious, not frivolous)

- **✕ Pass** · **★ Interested** — mutual Interested ⇒ a **Match**.
- **Pitch** (the depth action, not a "super-like"): send a short, directed pitch — signals
  real intent, not a swipe reflex.
- Keyboard + drag both supported; respects reduced-motion.

## 5. Three core screens

1. **Discover** — the swipe deck. One focal card, complementarity-ranked by the engine,
   filters (arena, archetype, stage, region). Empty/low-pool state is honest ("widen
   filters / invite a founder"), never fabricated profiles.
2. **Match** — the moment two founders are mutually Interested. Celebratory but substantive:
   side-by-side CompanyContext, the computed complementarity, and the **paywall** (see §6).
3. **Cofounder Room** — a two-person space post-match: full CompanyContexts, a chat, a
   "thesis alignment" checklist, and the terminal action **Form the team** → the OPC becomes
   a **team tenant** and the *entire compiled company carries over* (structural outcome).

## 6. Monetization (paid = landing price; paywall at Match)

The highest-intent moment is the Match — that's where we charge.
- **Free:** limited daily swipes; you can see *that* you have matches.
- **Paid (= the landing-page price, same plan):** unlock **Match / Cofounder Room / Form-team**,
  unlimited swipes, "who's Interested in you", Pitch priority.
- Anchored to the existing landing plan via `@nebutra/billing` (single price source — do not
  hardcode a number; read the plan).

## 7. License DX (ties to the funnel)

Forming the team (and any signup/CLI entry) carries the **Sailor commercial-exemption
license** (over AGPL) — the team tenant inherits it. Raw GitHub fork = AGPL. (Detail lives in
the separate licensing spec; this surface just *honors* it — a matched team is a licensed team.)

## 8. Originality vs the field

| | Tinder | AngelList / YC match | **Nebutra Match** |
|---|---|---|---|
| Matches on | photo + bio | résumé / tags | **compiled CompanyContext + computed complementarity** |
| Trust | none | weak | **governed: real account, audited, license** |
| Outcome | chat | warm intro | **a real team tenant; the whole company carries over** |

## 9. Existing real infrastructure to wire (no mock)

- `packages/ai/cofounder-match` — the matching/complementarity engine (real).
- `@nebutra/billing` — landing-price plan for the Match paywall.
- Tenant supertype (Individual → Organization) — OPC → team upgrade.
- `@nebutra/license` + create-sailor `license-emit` — commercial exemption carried into the team.
- Startup OS `CompanyContext` — the card + matching substrate.

## 10. Design-system constraints

`@nebutra/ui` / `/primitives` / `@nebutra/icons` / tokens / `AnimateIn` only. Brand gradient
for the Match moment. No hand-craft. Real data + honest empty states only (no fabricated
candidate profiles — pool comes from real opted-in founders). Dashboard surface → Geist icons,
not Phosphor.

## 11. Non-goals (first iteration)

- No ML ranking beyond the existing `cofounder-match` engine's complementarity score.
- No public/marketplace discovery outside opted-in tenants.
- No messaging platform beyond the Cofounder Room's scoped chat.
- Tenant-naming change (OPC / Match-your-cofounder label) ships independently as a small
  safe slice; the matchmaking surfaces are the larger build.

## 12. Open decisions (for the user)

1. **Opt-in model:** founders must explicitly opt into the cofounder pool (privacy) — confirm
   the default is opt-OUT until a founder joins Discover.
2. **Free-tier swipe limit** (e.g. N/day) — pick a number, or defer to billing config.
3. **Match paywall side:** does *one* paying founder unlock the Cofounder Room, or must *both*
   pay? (Recommend: the initiator pays to open the Room; the other joins free — classic
   marketplace liquidity.)

Implementation: tenant-naming slice first (safe), then Discover → Match → Cofounder Room as
new components under `apps/web/src/components/cofounder-match/**` (new files — does not touch
the loop-owned Startup OS command-center).
