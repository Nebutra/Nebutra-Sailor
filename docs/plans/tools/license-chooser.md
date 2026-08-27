# Tool brief: license-chooser

Root: **Template** (21, empty root — candidate #1 per §6.7.9). Object: text/repo-config.

**内部修订状态：** this is a P0 redo of the competitor set and archetype
argument. The previous version cited choosealicense.com as proof a
multi-step *wizard* works while its own text described that site as a
single-question, three-card triage — that was evidence against a wizard, not
for one, and two of the other three competitors were generic multi-tool
aggregators unrelated to licensing content. Four more sources were reached to
settle the question honestly. The verdict changed: **triage beats a wizard
here.** See §8.

## 1. Demand

- **JTBD:** "I have a new repo and no idea which open source license to put on
  it" → walk away with (a) a license I understand the tradeoffs of and (b) a
  ready-to-commit `LICENSE` file with my name/year filled in.
- **Keywords:** open source license chooser, choose a license, MIT vs GPL,
  generate LICENSE file
- **Pain:** most searchers do not know the vocabulary (permissive / copyleft /
  patent grant) yet, so a bare comparison table or dropdown is a wall, not an
  answer. Separately, once a license *is* chosen, actually getting a correct,
  filled-in file out is a second, distinct chore.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| choosealicense.com | https://choosealicense.com/ | yes (WebFetch + screenshot) | [choosealicense.webp](../../research/forge/license-chooser/choosealicense.webp) |
| ToolzPlus LICENSE Picker | https://www.toolzplus.com/developer-tools/license-picker/ | partial — WebFetch got HTTP 403, headless screenshot capture succeeded (HTTP 200) and is legible | [toolzplus-license-picker.webp](../../research/forge/license-chooser/toolzplus-license-picker.webp) |
| AnyTools License Chooser | https://www.anytools.work/en/developer/license-chooser/ | yes (WebFetch + screenshot) | [anytools-license-chooser.webp](../../research/forge/license-chooser/anytools-license-chooser.webp) |
| tldrlegal.com | https://tldrlegal.com/ | yes (WebFetch + screenshot) | [tldrlegal.png](../../research/forge/license-chooser/tldrlegal.png) |
| "choosingalicense.com" — compare mode | https://choosingalicense.com/compare | yes (screenshot; WebFetch returned only the page title on this one, screenshot is the source of truth) | [choosingalicense-compare.png](../../research/forge/license-chooser/choosingalicense-compare.png) |
| "choosingalicense.com" — wizard mode | https://choosingalicense.com/wizard | yes (screenshot) | [choosingalicense-wizard.png](../../research/forge/license-chooser/choosingalicense-wizard.png) |
| EC Joinup Licensing Assistant — "About" | https://interoperable-europe.ec.europa.eu/collection/eupl/solution/licensing-assistant/about (redirected from the joinup.ec.europa.eu URL supplied) | yes (WebFetch + screenshot) | [ec-joinup-about.png](../../research/forge/license-chooser/ec-joinup-about.png) |
| EC Joinup Licensing Assistant — "Find and compare" tool itself | https://interoperable-europe.ec.europa.eu/collection/eupl/solution/licensing-assistant/find-and-compare-software-licenses | yes (screenshot, full page + top crop) | [ec-joinup-tool.png](../../research/forge/license-chooser/ec-joinup-tool.png), [ec-joinup-tool-top.png](../../research/forge/license-chooser/ec-joinup-tool-top.png) |
| internettoolset.com/git/license-chooser | https://internettoolset.com/git/license-chooser | yes (WebFetch + screenshot) | [internettoolset.png](../../research/forge/license-chooser/internettoolset.png) |

All files exist under `docs/research/forge/license-chooser/` (verified with
`ls -la`). No competitor was described from memory or assumption — everything
below is read off the fetched content or the screenshot pixels. One honest
caveat up front: **"choosingalicense.com" is a different, confusable domain
from GitHub's real choosealicense.com** — self-branded "Open License Helper,"
tagline "the world's most trusted open source license selection assistant"
(a self-declared, unverifiable superlative, not backed by any named
organization the way choosealicense.com is backed by GitHub). Its UI pattern
("3/4 licenses selected," a fabricated-looking "Popularity" percentage bar per
license) reads as the same templated-tool-factory production as ToolzPlus and
AnyTools, not as a second GitHub-grade authority. It is still useful evidence
— it is the one live site that actually built the multi-step wizard shape —
but it should not be weighted as a peer to the real choosealicense.com.

## 3. Feature inventory

**choosealicense.com** — core strength is the *decision tree itself*, nothing
else:
- Three scenario cards ("I need to work in a community" / "I want it simple
  and permissive" / "I care about sharing improvements") each resolving to one
  license (community-preferred / MIT / GPLv3) with a one-line rationale and
  real named adopters (Babel, .NET, Rails → MIT; Ansible, Niri, uBlock Origin →
  GPLv3).
- Escape hatches below the fold: "My project isn't software" → non-software
  licenses, "I want more choices" → full catalog, "I don't want to choose a
  license" → explains the legal consequence of no license.
- **No license-file generation, no copy/download, no comparison table** on
  this page — it is reasoning only, then it hands off. Footer explicitly
  credits "GitHub, Inc. and You" and CC-BY-3.0 licensing of the content itself
  — confirms this is the GitHub-curated canonical resource, not a random blog.
- No upsell, no ads, no related-tools rail. It is a single honest page. **This
  is one question, three answers, resolved on click — a triage, not a
  multi-step wizard.** There is no "question 2."

**ToolzPlus LICENSE Picker** — core strength is the *generator*, wrapped in a
lot of SEO padding:
- A "Quick Recommendation" mini-quiz: single radio-button question ("What
  matters most to you?") with four options (Maximum freedom / Keep it open,
  while derivatives stay open / Patent protection / Public domain) and a "Get
  Recommendation" button.
- A **License Comparison table**: MIT, Apache-2.0, GPLv3, BSD-2, BSD-3, ISC,
  MPL-2.0, LGPL-3.0, AGPL-3.0, Unlicense, CC0 — columns Commercial Use,
  Modify, Distribute, Patent Grant, Copyleft, and a "Select" action per row.
- A **Generate LICENSE** panel: license dropdown, copyright-holder text
  input, year input, "Generate LICENSE" + "Clear" buttons. (The screenshot was
  captured pre-interaction, so the actual rendered LICENSE output after
  clicking Generate was not observed — noted honestly, not assumed.)
- Trust badges above the tool: "100% Free / No Signup / Instant Results /
  Privacy Protected."
- Below the tool: a very long SEO wall — "Understanding Open Source
  Licenses," "Permissive vs Copyleft," "Popular Licenses at a Glance," FAQ,
  External Resources, "More Related Tools," inside a page that also has a
  sidebar table-of-contents and a "Browse Categories" rail with tool counts
  per category (Conversion 320, Developer Tools 167, etc.) — clearly a
  template reused across the whole ToolzPlus catalog, not bespoke to this
  tool.

**AnyTools License Chooser** — core strength is *live comparison +
live-generated text in one panel*:
- License tabs: MIT / Apache 2.0 / GNU GPLv3 / BSD-3-Clause. Selecting a tab
  updates a Permissions / Conditions / Limitations checklist (Commercial use,
  Modifications, Distribution, Private use / Include copyright / Liability,
  Warranty) for that license.
- "Customize Information": Year + Full Name inputs.
- "Generated License" panel showing the **full license text already filled**
  with the current tab's license + the year/name values, with visible Copy
  and Download buttons plus a share icon — this is the competitor whose
  screenshot shows the output *already rendered*, i.e. configure-then-generate
  without a submit button.
- Below the fold: an enormous "SEO furniture" stack shared with AnyTools'
  other tool pages — "What is Open Source License," Features cards, Use
  Cases (labelled CODE/EVIEW/DOC, generic wording that reads templated across
  their whole site), Usage Guide, Technical Introduction, Related Tools tiles
  (Device Information, Emoji Picker, Keyboard Test, Screen Size Test — utterly
  unrelated to licensing, confirming this is a shared cross-sell block, not
  curated), an FAQ, Related Documents links out to GitHub/OSI/SPDX/TLDRLegal,
  and a **User Comments** section with a submit form ("0/2000" characters, "No
  comments yet").

**tldrlegal.com** — a different job entirely: *lookup, not choice*.
- Headline "Software Licenses in Plain English" / "Look up popular software
  licenses summarized at-a-glance," with a prominent search box ("Search Code
  Licenses, EULAs, ToS and Software Licenses") and a "Verified Content" grid
  of six license cards (CDDL-1.0, MPL-2.0, MPL-1.1, EPL-1.0, GPL-3,
  Apache-2.0) that link out to per-license explainer pages.
- **No quiz, no wizard, no comparison table, no generator, no scenario
  cards anywhere on the homepage.** The entire interaction is: know (or
  search for) a license name → read its plain-English summary.
- Heavy FOSSA sponsor branding — a top banner and a large bottom CTA block
  ("tl;drLegal is brought to you by FOSSA, the most complete open source
  management platform... Manage open source risk...") make clear this is a
  lead-gen surface for FOSSA's compliance product, not a neutral reference.
- **Verdict: not a decision tool at all.** It answers "what does license X
  mean," not "which license should I use." It is real evidence that a
  meaningfully different, non-competing job exists (glossary lookup for
  someone who already has a name in hand) — it says nothing about wizard vs.
  triage for the *choosing* job.

**"choosingalicense.com" — /compare** — a genuine multi-select comparison
matrix, paired with an explicit hand-off to its own wizard:
- "Add License" control lets a visitor stack up to 4 license cards
  side-by-side (screenshot shows MIT, Apache-2.0, GPLv3 selected, "3/4
  licenses selected"); each card shows a one-paragraph summary, a
  permissive/strong-copyleft tag, a "Popularity" percentage bar, and the SPDX
  id in a monospace chip.
- Below the cards: a **"Detailed Feature Comparison"** table — rows grouped
  into Permissions (Commercial Use, Modification, Distribution, Private Use,
  Patent Use), Conditions (License and Copyright Notice, State Changes,
  Disclose Source, Same License, Network Use is Distribution), Limitations
  (Trademark Use, Liability, Warranty) — columns are the selected licenses,
  cells are check/cross icons with a legend. This is the same
  permissions/conditions/limitations taxonomy ToolzPlus and AnyTools use,
  at higher fidelity (11 rows instead of ~6).
- At the bottom: a callout card, **"Need Help Choosing the Right License? Use
  our License Wizard to get personalized recommendations" → "Start License
  Wizard"** — i.e. this site treats compare and wizard as two separate,
  cross-linked destinations, not one fused flow. **No license-text
  generation, Copy, or Download control anywhere on the compare page itself**
  — comparing and generating are different pages on this site too.

**"choosingalicense.com" — /wizard** — the one genuine multi-step wizard
found in this whole research pass:
- "License Selection Wizard — Answer 5 simple questions about your project
  and we'll recommend the perfect open source license... with detailed
  explanations and reasoning."
- Step 1 of 5, labelled progress bar ("Question 1 of 5 · 20% complete"):
  "What type of project are you working on?" with four single-select radio
  cards (Library/Framework, Application/Tool, Website/Web App,
  Documentation/Content), Previous (disabled on step 1) / Next buttons.
- **Steps 2–5 were not captured** — advancing requires interactive form
  submission the static-screenshot capture does not perform, and no other
  page exposes their content. Whether the wizard's final step links to, or
  feeds, a generator (this site's own /compare has no generate control; a
  separate generator page was not found in the reached navigation) is
  **not verified — flagged as such, not assumed either way.**
- This is real, hard evidence that a 5-question, `Question X of 5`, one
  question per screen shape exists in the market for exactly this job — the
  question the P0 redo exists to answer is whether that shape is *better*
  than a single-screen triage, not whether it exists.

**EC Joinup Licensing Assistant** — government-built, but **not** a
scenario-driven decision wizard; it is a large faceted filter/browse tool:
- "About" page: "The Licensing Assistant helps you to **compare, select and
  combine** open-source software licenses... It offers content analysis and
  compatibility check and includes searchable SPDX identifiers." Three named
  capabilities: **Compare**, **Select**, and **Combine** — the last of these
  (combining/checking compatibility between two *already chosen* licenses,
  via a separate "Compatibility Checker" tab) is a different job than
  first-time selection and not directly comparable to our brief's JTBD.
- The tool itself ("Find and compare software licenses"): a single long page
  listing dozens of licenses, each as a row of colored facet chips (six
  categories — **Can** / **Must** / **Cannot** / **Compatible** / **Law** /
  **Support** — each with clickable facet values like Sublicense, Disclose
  source, Ethical clauses, GPL-compatible, OSI approved) followed by a short
  prose summary per license. This is a **filter-by-facet directory**, not a
  sequence of plain-language questions — a visitor must already know what
  "Sublicense" or "Ethical clauses" or "Copyleft/Share a." mean to use the
  facets productively.
- Retrieval is also SPDX-id-driven ("licences can be retrieved by entering
  all or part of their SPDX identifier... 'UPL' will retrieve both UPL-1.0
  and EUPL") — i.e. it assumes the visitor may already have a candidate id in
  mind, the opposite assumption from our JTBD's "no idea which license."
- **No license-text generation, no year/holder fields, no Copy/Download** —
  the deliverable here is a comparison verdict and a compatibility verdict,
  not a file.
- **Verdict: this is the most sophisticated version of the
  comparison-table/faceted-catalog shape found, not prior art for a
  scenario wizard.** It reinforces know-how #2 (a feature-matrix, however
  well executed, presumes vocabulary a first-time chooser doesn't have) more
  than it argues for staged Q&A.

**internettoolset.com/git/license-chooser** — same shape and same debt as
ToolzPlus/AnyTools, a fourth data point for configure-then-generate:
- Nine license cards stacked in one scrollable column (MIT, Apache-2.0,
  GPLv3, BSD-3, BSD-2, LGPLv3, MPL-2.0, Unlicense), each showing a one-line
  description plus inline Permissions/Limitations/Conditions tag rows — click
  a card to select it (radio-style, single select, MIT shown selected in the
  capture).
- Two fields below the list — Author Name, Year — then **Generate License**
  and **Reset** buttons. No quiz, no staged question anywhere on this page.
- A **"Quick Decision Guide"** section exists, but it is static prose ("Choose
  MIT if: You want maximum adoption...") under each license heading, not an
  interactive control — reading substitutes for a quiz here, same
  approach as the "3-card row" this brief already flagged in
  choosealicense.com, minus the scenario framing.
- Below the tool: the same SEO-wall pattern as the other two generators — Why
  License, License Comparison, Common Misconceptions, How to Add a License,
  License Headers in Source Files, Multiple Licensing, Related Tools (Branch
  Name Generator, Git Commands Cheat Sheet, Merge Conflict Playbook, ReReg
  Recovery Helper — at least git-topic-adjacent, unlike AnyTools' Emoji
  Picker/Screen Size Test, but still furniture, not workflow), Further
  Reading.

## 4. Journey maps

**choosealicense.com** — arrival → one click on one of 3 cards → inline
reveal (license + why + adopters) → link out to the license text (not
generated). One screen, one interaction, no wizard steps.

**"choosingalicense.com" /wizard** — arrival → Question 1 of 5 (radio cards)
→ Next → (steps 2–5 not observed) → presumably a final recommendation screen.
Five screens minimum, sequential, cannot skip ahead (Previous disabled on
step 1 implies forward-only progression at that point). Whether it ends in a
generator is unverified.

**ToolzPlus** — three separate, unsignposted entry points stacked on one
page (quiz radio / comparison table / generator dropdown) — a user can start
in any of the three with no guidance on which to use; transitions between
them (quiz → row selection → generator prefill) are inferred structure, not
confirmed since the generate button was not clicked.

**AnyTools** — tab click (no quiz) → Permissions/Conditions/Limitations grid
updates → Generated License panel is already live-rendered with the current
tab + fields, no submit step. Fastest path to output of any competitor
reached, but assumes the visitor already knows which license they want.

**"choosingalicense.com" /compare** — arrival → Add License (up to 4) →
scroll to the Detailed Feature Comparison table → either read it directly or
click "Start License Wizard" if undecided. Comparing and deciding-via-wizard
are explicitly two different journeys on this one site, cross-linked, never
fused.

**EC Joinup** — arrival at a single very long page → scan or filter by facet
chip or search by partial SPDX id → read the per-license prose summary for
candidates → (separately) open the Compatibility Checker if combining two
licenses. No sequential questions; the whole license set is visible/filterable
at once.

**internettoolset.com** — arrival → scroll a 9-card list, read inline
Permissions/Limitations/Conditions tags per card, optionally read the static
"Quick Decision Guide" prose → click a card to select → fill Author/Year →
Generate License. One screen, no staged questions, generation is confirmed
reachable (unlike ToolzPlus, where the click-through wasn't captured) because
the card-select + fields + button are all on one static page with no
intermediate navigation implied.

**tldrlegal.com** — arrival → search or click a verified-license card →
navigate to a per-license explainer page. Not a "choose" journey at all.

## 5. Layout + screenshots

- **choosealicense.com**: single column, ~1000px content width, no sidebar,
  no ads. Three-card row is the only "options density" on the page.
- **"choosingalicense.com"**: conventional SaaS-marketing-tool chrome — top
  nav with Home / Licenses / License Wizard / Compare / FAQ as coequal
  destinations, no persistent sidebar, a closing CTA banner on /compare
  pointing at the wizard, and a generic three-column footer (Quick Links /
  Resources) typical of a templated tool site rather than a bespoke build.
- **ToolzPlus**: two-column desktop layout, persistent right sidebar (TOC +
  promo card + category-tool-count directory), generator and comparison
  table both below the fold on first load.
- **AnyTools**: single main column plus a left global nav rail typical of a
  multi-tool directory shell; page is ~11,000px overall because of shared
  SEO/FAQ/comments furniture below a tool footprint of roughly the top
  1,400px.
- **EC Joinup**: full EU-portal chrome (mega-nav, cookie banner, "About the
  Commission" footer column) wrapping a single very long filterable list —
  no sidebar dedicated to the tool itself; the facet-chip row (6 categories ×
  several values) sits directly under the title and is the primary above-
  the-fold real estate, confirming filter-by-facet, not question-by-question,
  is the core interaction.
- **internettoolset.com**: left global nav rail (tool categories: Programming
  / Data / Internet, favorites, per-tool-type lists) typical of a multi-tool
  directory, single main column for the tool itself, then the same
  SEO-wall/related-tools pattern as ToolzPlus/AnyTools below it.
- **tldrlegal.com**: single column, generous whitespace above the fold
  (search bar, 6-card grid), then a large full-bleed FOSSA sponsor CTA band
  before the footer — no sidebar, no wizard/table chrome at all because
  there is no decision tool on this page.

**Screenshots on disk (verified):**

```
docs/research/forge/license-chooser/choosealicense.webp
docs/research/forge/license-chooser/toolzplus-license-picker.webp
docs/research/forge/license-chooser/anytools-license-chooser.webp
docs/research/forge/license-chooser/tldrlegal.png
docs/research/forge/license-chooser/choosingalicense-compare.png
docs/research/forge/license-chooser/choosingalicense-wizard.png
docs/research/forge/license-chooser/ec-joinup-about.png
docs/research/forge/license-chooser/ec-joinup-tool.png
docs/research/forge/license-chooser/ec-joinup-tool-top.png
docs/research/forge/license-chooser/internettoolset.png
```

## 6. Their debt

- **ToolzPlus / AnyTools**: covered in the prior pass — unrelated cross-sell
  tiles (AnyTools), unverifiable end-to-end generation (ToolzPlus), comment
  box with moderation liability (AnyTools), heavy sidebar/category furniture
  (ToolzPlus), no visible API on either.
- **"choosingalicense.com"**: confusable domain name with zero visible
  authorship or backing organization, paired with a self-declared "world's
  most trusted" superlative — a trust problem GitHub's real
  choosealicense.com does not have. Fabricated-feeling "Popularity" percentage
  bars on the compare page with no cited source. Wizard and compare and
  (implied, unverified) generator are three separate pages/destinations, not
  one flow — exactly the "three redundant/unsignposted entry points" debt
  already flagged for ToolzPlus, just organized as top-nav tabs instead of
  one stacked page.
- **EC Joinup**: heaviest possible institutional chrome (EU cookie banner,
  mega-nav, "official website of the European Union" bar) sits directly on
  top of the tool; the facet vocabulary (Sublicense, Ethical clauses,
  Copyleft/Share a.) is precise but assumes a legally literate visitor —
  exactly the vocabulary gap know-how #2 already identifies as the failure
  mode of pure comparison tables; no license-text generation at all, so a
  government developer who finishes here still leaves to go write the file
  themselves, the same gap choosealicense.com has.
- **internettoolset.com**: same generator-plus-SEO-wall shape and debt as
  ToolzPlus/AnyTools (long essay stack, static "Quick Decision Guide" prose
  standing in for real interactivity); left nav rail cross-sell is at least
  git-topic-adjacent (Branch Name Generator, Merge Conflict Playbook) rather
  than AnyTools' unrelated Emoji Picker, so this is the mildest version of
  that particular debt among the three generators.
- **tldrlegal.com**: not really "debt" against our JTBD since it doesn't
  attempt the choosing job at all — but it is heavy vendor lead-gen (FOSSA
  branding top and bottom) for a page that presents itself as a neutral
  reference.

## 7. Domain know-how

A naive implementation — "dropdown of license names + textarea" — gets these
wrong:

1. **No license ≠ public domain.** Default copyright means "all rights
   reserved" even on a public GitHub repo; visibility is not permission. This
   is the single most common misconception and both choosealicense and
   ToolzPlus address it explicitly ("What happens if I don't include a
   license?" / "Here's what happens if you don't"). Our tool must state this,
   not assume it's obvious.
2. **The real decision axis is a trichotomy, not a feature matrix**:
   permissive (MIT/BSD/ISC/Apache-2.0) vs weak copyleft (LGPL/MPL — obligation
   is file-scoped) vs strong copyleft (GPL/AGPL — obligation covers the whole
   combined work). A checklist of "commercial use / modify / distribute"
   flags all read "yes" for almost every OSI license and does not teach the
   actual tradeoff. **Now reinforced twice over**: choosealicense's
   scenario framing outranks pure comparison tables for a first-timer, and
   the EC Joinup facet directory — the most thorough comparison surface
   reached in this whole pass — still requires knowing terms like
   "Sublicense" and "Ethical clauses" going in.
3. **AGPL is not "GPL for servers" as a footnote — it's a distinct trigger.**
   AGPL adds a network-use clause (offering the software as a network service
   counts as distribution) that plain GPL does not have. A tool that lumps
   AGPL into "strong copyleft, same as GPL" misleads SaaS builders specifically.
4. **GPL "-only" vs "-or-later" is a real, separate choice**, not a version
   typo — it affects downstream compatibility (e.g. combining with
   Apache-2.0-licensed code requires GPL-3.0-or-later, not GPL-2.0-only).
   SPDX expresses this as distinct identifiers (`GPL-3.0-only` vs
   `GPL-3.0-or-later`).
5. **Apache-2.0's explicit patent grant (and litigation-termination clause)
   is the actual reason companies pick it over MIT** — MIT/BSD are silent on
   patents. A tool that presents Apache-2.0 as "MIT with more paperwork"
   erases the one reason a company legal team cares about it.
6. **SPDX identifiers are the machine-facing artifact**, not the friendly
   name — `package.json`'s `license` field, `Cargo.toml`'s `license` field,
   `pyproject.toml`, and REUSE-compliance tooling all expect the exact SPDX
   id (`MIT`, `Apache-2.0`, `GPL-3.0-or-later`), not "GNU General Public
   License v3.0." EC Joinup's own retrieval-by-SPDX-id feature is further
   confirmation that SPDX id, not friendly name, is the interoperable key —
   any generator output must carry the SPDX id alongside the friendly name.
7. **License text must be byte-faithful to the canonical OSI/SPDX text**,
   with only the copyright line's holder/year substituted — this is a legal
   document, not marketing copy; no paraphrasing, no "improving" the wording.
8. **Placement convention matters and is not obvious to a first-timer**: a
   file literally named `LICENSE` (no extension, by GitHub convention) at the
   repo root, cross-referenced from `package.json`/`Cargo.toml`/
   `pyproject.toml`'s `license` field — the tool should say this, since none
   of the competitors reached make it prominent (ToolzPlus and
   internettoolset.com both bury it in an FAQ/guide answer well below the
   tool).
9. **Non-software content needs a different license family** (Creative
   Commons, not an OSI software license) — choosealicense explicitly forks
   this off; a license chooser that only lists software licenses will
   mis-recommend for docs/art/data repos if it doesn't ask first.
10. **Comparing/combining two already-chosen licenses is a different job
    from choosing the first one.** EC Joinup gives this job its own separate
    "Compatibility Checker" surface rather than folding it into the chooser.
    Our tool's JTBD is the first job only — we should not blur the two by
    trying to also answer "can I mix GPL and Apache code" inside this tool.

## 8. Chosen archetype — reargued honestly against the new evidence

**Verdict: triage beats a wizard here. The multi-step "decision wizard" label
does not survive; a single-step scenario triage, fused directly into
configure-then-generate on the same screen, does.**

### What actually supports a multi-step wizard, after reaching it

Exactly one live example of a genuine multi-step wizard for this job was
found — "choosingalicense.com"'s `/wizard` (5 sequential questions, one per
screen, forward-only progress bar). That is real: multi-step wizards for
license selection do exist in the wild, so the previous brief's critique that
"nobody builds this" would have been too strong. But the source is weak: a
confusably-named, self-superlative, likely templated tool site with no
verifiable authority or traffic, and — critically — **we could not verify it
ends in a generated file.** Its own sibling page (`/compare`) has no generate
control, and no separate generator page turned up in the reached navigation.
So the one wizard example found may itself terminate at a bare
recommendation, the same gap choosealicense.com has.

### What actually supports triage instead

- **The one source in the set with named institutional backing (GitHub's
  choosealicense.com — its own footer credits "GitHub, Inc. and You" and
  CC-BY-3.0 content licensing, §3; this is an authorship fact, not a
  measured traffic or rank claim) resolves the decision in a single click on
  one of three cards** — no "question 2." That was already true in the prior brief
  and remains the strongest single data point after reaching six more sites.
- **Every source that actually ships a generated file** — ToolzPlus,
  AnyTools, internettoolset.com — does it from **one flat selection surface**
  (a dropdown, tabs, or a single-select card list) plus two trivial fields
  (holder, year), never from a sequence of screens. Two trivial fields do not
  justify sequential disclosure.
- **The EC Joinup Licensing Assistant, the most sophisticated comparison
  surface reached, is a single filterable page, not a question sequence** —
  further evidence that even institutional-grade tooling in this space
  favors "show everything, let the visitor filter/read," over staged Q&A,
  when the goal is comparison rather than a single yes/no triage moment.
- **"choosingalicense.com" itself keeps the wizard and the generator (if one
  exists) on separate pages** — i.e. even the one real-world multi-step
  wizard example does not demonstrate a wizard *feeding* a generator in one
  flow. Nothing reached in this whole pass fuses decision and generation into
  one continuous screen. That gap — not "wizard vs. triage" — is where the
  actual, defensible differentiator lives (§9.5).

### Why the other archetypes are still wrong here (unchanged from the prior pass, now double-checked against the 4 new sources)

- **Instant transform** — there's no input text to transform; the value is
  reasoning, not a paste-and-convert operation. Nothing in the 4 new sources
  changes this.
- **Multi-step wizard as the primary/only path** — addressed above: the one
  real example has no named backing organization and its output stage is
  unverified; the GitHub-backed example (choosealicense.com) resolves in one
  step.
- **Configure-then-generate alone, leading with a flat pick list (skip any
  decision help)** — this is what ToolzPlus, AnyTools, and
  internettoolset.com effectively do, and it assumes the visitor already
  knows which license they want. That's the minority of search intent for
  "choose a license" — most people are searching *because* they don't know
  (know-how #2, reinforced by EC Joinup requiring facet vocabulary too).
  Using it as the entire journey would just be a fourth copy of
  ToolzPlus/AnyTools/internettoolset.com.
- **Drop-and-verdict** — there's no file being dropped or detected; nothing
  to verdict on.
- **Two-pane compare / faceted catalog** — "choosingalicense.com"'s
  /compare and EC Joinup's facet directory are both fine *secondary* escape
  hatches for people who already have the vocabulary, but leading with either
  is a wall for the majority who don't (know-how #2). EC Joinup in particular
  shows what this looks like taken to its most thorough, government-funded
  extreme — comprehensive, but not beginner-legible.
- **Inspect-and-drill** — there's no existing structured artifact to explore.
- **Batch queue** — single-answer, no batch dimension.
- **Lookup/glossary** — this is tldrlegal.com's actual job ("what does
  license X mean"), and it is a real, legitimate, but *different* job from
  ours (choosing, not defining). Out of scope for this tool's primary
  journey; at most a "what does this term mean" inline tooltip is worth
  borrowing, not a whole lookup surface.

### The archetype, restated

**Single-step scenario triage** (a small, fixed set of big option cards,
resolved on click, exactly like choosealicense.com's three cards — not a
sequence of "Question X of N" screens) **fused directly into
configure-then-generate on the same screen, with no page navigation between
deciding and generating.** This is not a renaming exercise: it changes what
gets built. There is no step counter, no Next/Previous, no ability to get
"stuck" on question 3 of 5 — the reveal and the fill-in fields appear inline,
below the cards, on first click.

## 9. Our design

### 9.1 Journey

*concrete*

1. **Arrival** (above the fold, single column, `max-w-4xl`): title "Choose an
   open source license," one-line value prop, then a row of scenario cards
   (stacked on mobile) — a fixed, small set, not a first-of-N question:
   - "I want anyone to use this freely" → permissive
   - "I want improvements shared back" → copyleft
   - "I'm contributing to an existing project" → community-preferred (links
     out, same as choosealicense — we don't fabricate a recommendation when
     the real answer is "match the dependency")
   - "This isn't software" → routes to the CC-license explainer, out of scope
     for the generator
   - Small, non-gating link: "I don't want to license it" → one paragraph
     explaining default-all-rights-reserved (know-how #1).
2. **Reveal (no page navigation, inline expand on click, no step counter):**
   the chosen scenario reveals one primary recommended license (name + SPDX
   id) with a short rationale, a compact Permissions/Conditions/Limitations
   chip row for *that one license only* (not the 11-row table EC Joinup or
   "choosingalicense.com" lead with), and a "not quite — 2 more options for
   this scenario" secondary link (e.g. permissive also offers Apache-2.0 for
   the patent-grant case, know-how #5).
3. **Configure-then-generate step (appears once a license is picked, same
   screen, same scroll position):** Year (defaulted to current year) and
   Copyright Holder / Org name fields (`@nebutra/ui/primitives`
   `Field`+`Input`), with the LICENSE text **live-updating below as they
   type** — no generate button, matching the AnyTools/internettoolset.com
   behavior that is actually confirmed to work, not ToolzPlus's
   separate-button version whose end-to-end result we could not verify.
4. **Output actions:** Copy button and Download button (filename `LICENSE`,
   no extension — know-how #8) pinned to the output panel; a small toggle
   "Also give me the SPDX header comment" emits the 2-line
   `SPDX-License-Identifier` comment block for source files — a real added
   feature none of the seven competitors have.
5. **Escape hatches**, same spirit as choosealicense but not copied verbatim:
   "Compare all licenses" (opens a compact table as a secondary view — think
   the permissions/conditions/limitations columns of "choosingalicense.com"'s
   compare page or EC Joinup's facets, at a fraction of the row count, not
   the default), "Full license catalog" link, "This isn't software" link.
   Unlike EC Joinup, we do **not** fold license-compatibility checking
   ("can I combine GPL and Apache code") into this tool — that is a
   distinct job (know-how #10) and, if built, belongs in its own tool.

### 9.2 Layout

- Single column, `max-w-4xl` (`--container-text`), centered — this is a
  reading/deciding task, not a dense dashboard, and specifically not the
  filterable-directory layout EC Joinup uses for the same underlying data.
- Above the fold: title, one-line value prop, and the full scenario-card row
  (4 primary + 1 small text link) visible together on a standard viewport —
  no "Question 1 of N" progress bar anywhere on the page.
- Reveal region sits directly below the cards, in the same scroll position —
  no navigation, no new page, no Next/Previous buttons.
- Configure-then-generate fields sit inline, directly under the reveal
  region: two inputs side by side on desktop, stacked on mobile, with the
  live `<pre>` output box (monospace, scrollable) immediately below and its
  Copy/Download controls anchored to the box's own top-right corner, not the
  page header.
- No sidebar, no category rail, no comment section, no cross-sell tiles, no
  EU-portal-style mega-nav-over-a-tool chrome, no "Popularity" percentage
  bars with no cited source — Forge's shell already provides
  related-by-root navigation elsewhere; duplicating any of this inline is
  exactly the debt pattern this brief has now seen four separate times
  (ToolzPlus, AnyTools, "choosingalicense.com," internettoolset.com).

### 9.3 Must-have

*without these, bounce to a competitor*

- The actual filled-in, ready-to-commit LICENSE text (byte-faithful to
  canonical OSI/SPDX text, know-how #7) with Copy **and** Download — this is
  the ToolzPlus/AnyTools/internettoolset.com table-stakes half of the job.
- The scenario-driven, single-click triage as the *default* entry, not a
  table and not a multi-step wizard — this is the choosealicense-proven half,
  now sharpened by seeing what both a real 5-question wizard
  ("choosingalicense.com") and a full faceted catalog (EC Joinup) look like
  and choosing neither shape for the entry point.
- Correct SPDX ids surfaced alongside friendly names (know-how #6).
- Explicit "no license = all rights reserved" statement (know-how #1),
  reachable without hunting through an FAQ wall.
- Mobile-usable single column, no horizontal scroll on the license text box.

### 9.4 Deliberately skipped

- **Multi-step, "Question X of N" wizard flow** — the only live example
  found ("choosingalicense.com") could not be confirmed to reach a generator
  at all, while the one source with named institutional backing (choosealicense.com)
  resolves in a single click; five screens for a decision that collapses to one
  question is added friction, not added clarity, for this JTBD.
- **Long SEO essay walls** ("Understanding Open Source Licenses," multi-FAQ
  sections, "License Evolution" history) that ToolzPlus/AnyTools/
  internettoolset.com all carry — kept to at most one short collapsible
  explainer per license; deep educational content belongs in docs, not
  stacked inside the tool workflow.
- **User comment section** (AnyTools) — no product need, pure moderation
  liability for a deterministic tool.
- **Full comparison/facet table as the primary/first surface** — kept as a
  secondary "compare all licenses" escape hatch, not the entry point, whether
  built like "choosingalicense.com"'s 11-row table or EC Joinup's 6-category
  facet directory — both assume vocabulary most first-time searchers don't
  have yet (know-how #2).
- **License-compatibility / combination checking** (EC Joinup's
  "Compatibility Checker") — a real, different job (know-how #10); not this
  tool's JTBD, and folding it in would blur the one-screen simplicity that is
  the actual differentiator.
- **Unrelated cross-sell tool tiles inside the page** (AnyTools' Emoji
  Picker/Keyboard Test block) — Forge's own related-by-root rail already
  covers this at the shell level.
- **Three-plus redundant entry points to the same decision** (ToolzPlus's
  quiz+table+dropdown side by side, or "choosingalicense.com"'s
  wizard/compare/(implied)generator spread across separate nav tabs) — one
  clear entry (the scenario cards), one clear secondary (the compare table),
  not three or four competing ones.
- **Self-declared trust/popularity claims with no citable source** (the
  "world's most trusted..." tagline and unsourced "Popularity" percentage
  bars on "choosingalicense.com") — if we ever surface adoption signal, it
  will be named real projects, the way choosealicense.com does (Babel, Rails,
  Ansible, uBlock Origin), never a bare unsourced percentage.

### 9.5 Differentiator

None of the seven competitors reached combine both halves of the job in one
flow:
- choosealicense.com has the trusted one-click decision tree but **zero
  output artifact** — you still leave to go write the file yourself.
- ToolzPlus/AnyTools/internettoolset.com have the output artifact but skip
  decision help (or bury it in a single quiz question buried under other
  entry points), and all three bolt it onto a large SEO/cross-sell/
  comment-box template that has nothing to do with licensing.
- "choosingalicense.com" has both a wizard *and* a generator-shaped compare
  page, but keeps them as separate, cross-linked destinations rather than
  one flow, and it is not clear its wizard reaches a generator at all.
- EC Joinup has the deepest comparison data of anyone reached, but no
  generation step and no beginner-legible entry point — it assumes the
  visitor already speaks the vocabulary.

Ours: a one-click scenario decision **feeds directly, on the same screen,
into** a live-filled, copy/download-ready `LICENSE` file, with no ad
furniture, comment box, unrelated cross-sell, or extra page navigation in the
workflow — and the same recommend/generate logic exposed as two schema'd,
deterministic (non-LLM) endpoints so an agent scaffolding a new repo can call
`license/recommend` then `license/generate` directly, which none of the seven
competitors offer at all.

### 9.6 I/O contract

*for the implementer*

```text
POST /api/v1/tools/license-recommend    sideEffect: pure   meterId: forge.template.license_recommend
in:  { scenario: "permissive" | "copyleft" | "community" | "unsure" }
out: { licenseId, spdxId, name, rationale,
       permissions: string[], conditions: string[], limitations: string[],
       alternates: [{ spdxId, name, why }] }

POST /api/v1/tools/license-generate     sideEffect: pure   meterId: forge.template.license_generate
in:  { spdxId: string, holder: string, year?: number }   // year defaults server-side to current year
out: { text: string, filename: "LICENSE", spdxHeaderSnippet: string }
```

Both are pure template/lookup operations (static decision table + string
substitution against canonical SPDX texts) — no LLM involved, no Router call,
fits the Template root's "deterministic, agent-callable" profile from
§6.7.2/§6.7.9.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — two operations sketched in §9.6 |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Meter ids proposed in §9.6 (`forge.template.license_recommend`, `forge.template.license_generate`); wallet hooks not built |
| 6 | Side-effect class declared | Declared `pure` in §9.6 (both operations) |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — no upload path, but the note is unwritten |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — the canonical SPDX license-text source and its version are undecided (see §11) |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (nine URLs, all captured) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8, re-argued against fresh evidence |

**内部验收状态：** `research` (teardown complete per §6.7.10 gate; no
engine/UI code written yet — this file plus the ten screenshots is the full
artifact of this task). Archetype changed from the prior pass: **single-step
scenario triage fused into configure-then-generate**, not a multi-step
decision wizard. §8 documents the full re-argument and the evidence that
moved it.

## 11. Gaps and open questions

- [ ] **"choosingalicense.com"'s wizard steps 2–5 were never seen** (§3).
      Advancing requires form submission the static capture does not perform,
      and whether the wizard ends in a generator at all is unverified. The
      archetype verdict in §8 rests partly on that unknown — it is argued as
      "the one wizard example cannot be shown to reach a file", which is
      honest, but a real browser session would settle it.
- [ ] **ToolzPlus's generate step was never clicked** (§3) — the rendered
      LICENSE output after "Generate LICENSE" was not observed, so its
      end-to-end generation is unconfirmed.
- [ ] **ToolzPlus WebFetch returned HTTP 403**; its description comes from the
      screenshot only.
- [ ] **The canonical license-text source is not chosen** (know-how #7, §9.3
      require byte-faithful text). SPDX's license-list-data repository is the
      obvious candidate, but which release we vendor, how it updates, and how
      we handle licenses whose canonical text carries placeholder fields
      beyond holder/year are all undecided — and this is the one place where
      being wrong is a legal problem, not a UX problem.
- [ ] **The scenario→license mapping is our own, not sourced.** §9.1's four
      cards mirror choosealicense.com's three plus a non-software route; the
      alternates offered per scenario (e.g. Apache-2.0 for the patent case)
      are drawn from know-how, not from a cited authority.
- [ ] **Mobile behaviour unverified** for all reached competitors (desktop
      captures only).
- [ ] **No jurisdiction/disclaimer position is written.** A tool that hands a
      user a legal document needs a stated "this is not legal advice" posture
      and a decision about whether we surface non-OSI or non-software (CC)
      licenses at all beyond a link-out.
- [ ] **Error codes and the privacy note are not yet written**
      (§10 gates 7, 8).
