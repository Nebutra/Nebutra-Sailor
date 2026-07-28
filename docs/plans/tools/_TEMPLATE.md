# Tool brief: `<slug>`

Root: **`<Root>`** (`<n>`, per §6.7.2a / §6.7.9). Object: `<what it operates on>`.
Tier: `<Core | Catalog | Job>` (§6.5 tiering table).

**Status:** `<research | research-complete | planned | lab | production>` — one
line on what exists today, so a reader knows whether this is a plan or a
description.

<!--
HOW TO USE THIS FILE
====================
Copy to `docs/plans/tools/<slug>.md` and fill it in. The section numbers,
titles and order are fixed: §6.5 gates 11 and 12 are checked against this
shape, so a brief that renames or reorders sections cannot be checked
mechanically. Sections 1–11 must all be present, in this order, even when the
honest content is "not yet researched".

THE ONE RULE THAT OUTRANKS COMPLETENESS: never write something you did not
verify. "Could not verify" is a finished answer. A fabricated URL, number or
feature claim is not. If a section is empty, say why it is empty and add a
line to §11 — a stated hole is worth more than a filled-in guess, and the
next person can close a hole they can see.

Files prefixed with `_` (like this one, and `_processor-batch-surface.md`) are
not tool briefs and do not follow this shape.
-->

## 1. Demand

- **JTBD:** the job the user hires this tool for, in their words, not ours.
- **Keywords:** what they actually type, including non-English phrasings.
- **Pain:** what goes wrong today. Be specific enough that §9 can be checked
  against it — a pain named here and unanswered in §9 is a gap, and belongs
  in §11.

## 2. Competitors (named, reached, captured)

3–5 real products, chosen by **actual reach** — what ranks for the keyword,
what the dev community reaches for — not the first three search hits. State
the search phrasings used.

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| `<name>` | `<full URL>` | Yes — WebFetch + screenshot / screenshot only / **No — <HTTP status or failure>** | [`<file>.png`](../../research/forge/`<slug>`/`<file>`.png) |

Capture with:

```bash
node scripts/research-screenshot.mjs "<url>" "docs/research/forge/<slug>/<name>.webp"
```

`docs/research/forge/` is gitignored: the captures are local reference
material, this brief is the committed deliverable, and anyone can regenerate
them from the URLs above. The script exits non-zero on failure — never record
a capture you do not have.

For anything **not** reached, say so in the table and make no feature, layout
or journey claim about it anywhere below. Carry it into §11.

## 3. Feature inventory

Per competitor: what it actually does, which capability is its **core
strength** (the reason people come), and which features exist only as
**upsell**. Distinguish observed behaviour from the product's own marketing
copy — say which is which. Close with the cross-competitor read: what everyone
does (table stakes), what only one does (worth adopting), what nobody does
(possible edge).

## 4. Journey maps

Per competitor, step by step: what the user sees on arrival, what they touch
first, how the result appears, how they get it out. **Note where the journey
has *no* button because it runs live** — that is a design decision, not an
omission. Record large-input and error behaviour where observed, and say
plainly where it was not observed.

## 5. Layout + screenshots

How each page is organised: input/output placement, options density, what is
above the fold, sidebar or no sidebar, mobile behaviour (or an explicit "not
verified — desktop capture only"). Then list the captures on file:

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/<slug>/<name>.png`

## 6. Their debt

Ad density, dark patterns, upload-required-for-local-work, dead UI, no API,
stale data, interstitials, signup gates. **取其精华，去其糟粕** — copy the
journey, not the chrome. Judge the flow separately from the styling.

## 7. Domain know-how

The non-obvious rules of this problem — the things that make a naive
implementation wrong. Numbered, so §9 and §11 can cite them (`know-how #3`).
Cite the source of each rule: a competitor's own copy, a standard, a spec, or
our own reasoning — and say which. A rule sourced from a standard should name
the clause.

## 8. Chosen archetype

**`<Archetype>`** — one of the seven in §6.7.10: Instant transform,
Configure-then-generate, Decision wizard, Drop-and-verdict, Two-pane compare,
Inspect-and-drill, Batch queue.

Then argue the other six away, one line each. A tool whose archetype is
"form + button" must be able to say why the other six were wrong for it — the
generic form runner is a *fallback*, never the default (§6.5 gate 12).

- **`<Archetype A>`** — why not.
- **`<Archetype B>`** — why not.
- …

## 9. Our design

### 9.1 Journey

Numbered steps: arrival → first touch → result → exit. Include the empty
state, the error state, and the large-input path. If a step exists only
because a competitor has it, say so; if a competitor's step is deliberately
dropped, that belongs in 9.4.

### 9.2 Layout

Where things sit: above the fold, single column vs two-pane, options
placement, mobile behaviour. Follow the house rules (`@nebutra/ui`
primitives, no raw form controls, no borders — separate with spacing and
tonal background shifts).

### 9.3 Must-have

Without these, a user bounces back to a competitor. Mark each as **parity**
(table stakes we must not ship below) or **edge** (something they do not
have). Do not claim a table-stakes item as a differentiator.

### 9.4 Deliberately skipped

Each with its reason. This is where competitor debt gets refused on purpose
(ads, upsell, upload-gating), and where scope is drawn against neighbouring
tools and roots.

### 9.5 Differentiator

What a user gets here that they cannot get there — checked against §3 and §6,
not asserted. If the capability turned out to be table stakes, say so and move
it to 9.3. Structural edges (one contract for human + agent, no ad clutter,
composition) count, but say which ones actually apply here.

### 9.6 I/O contract

```text
input:   { … }
output:  { … }
sideEffect: pure | read | write | external
meterId: forge.<root>.<operation>
roots:   [ … ]
objects: [ … ]
```

Sketch, not final schema — but concrete enough that §6.5 gates 2 and 6 have
something to check.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | |
| 3 | MCP tool registration (Agent-eligible tools) | |
| 4 | SKILL.md (what / when / how / limits) | |
| 5 | Meter id + wallet hooks | |
| 6 | Side-effect class declared | |
| 7 | Stable error codes; `request_id` on server paths | |
| 8 | Privacy note: client-only vs uploaded; retention | |
| 9 | Decl/ads: intent title, unique value, related tools | |
| 10 | Decl engine metadata: upstream SOTA name + version | |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 / **Not met** — why |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 / **Not met** — why |

Use "Not started — research-only brief" while this is still a plan. Do not
write "Met" for a gate whose evidence is not in this file.

## 11. Gaps and open questions

Every brief has this section, and no brief has it empty. A thin brief's gaps
section should say it is thin rather than let the prose hide it.

- [ ] **Anything not reached** — the URL, the failure mode, how many attempts.
- [ ] **Anything read from marketing copy rather than observed behaviour.**
- [ ] **Anything inferred** — rank, traffic, "the leader", "the highest-traffic
      incumbent". These need a measurement or an explicit *inference* label;
      an unsourced superlative is a fabrication with a confident tone.
- [ ] **Anything deferred** — with the trigger that would reopen it.
- [ ] **Any §9 subsection left unwritten**, and any §10 gate whose status is
      "not recorded" rather than "not met".
- [ ] **Any pain named in §1 that §9 does not answer.**
