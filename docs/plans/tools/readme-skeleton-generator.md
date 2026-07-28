# Tool brief: readme-skeleton-generator

Root: **Template** (21) — Order 1 of the empty-root fill sequence (§6.7.9). Object: text/markdown.

## 1. Demand

- **JTBD:** Start a new repo → get a complete, correctly-structured `README.md` skeleton without hand-typing the standard sections or looking up shields.io badge syntax from memory.
- **Keywords:** readme generator, create a readme, readme.md template, github readme generator
- **Pain:** Blank-page problem for a document every repo needs; forgetting a standard section (license, install, usage); badge markdown syntax is fiddly; TOC anchors don't match GitHub's slugification if hand-written.

## 2. Competitors (named, reached, captured)

| Competitor | URL | Reached | Screenshot |
|---|---|---|---|
| **readme.so** | https://readme.so/ (editor: `/editor`) | Yes — WebFetch + screenshot | `docs/research/forge/readme-skeleton-generator/readme-so-landing.webp`, `readme-so-editor.png` |
| **makeareadme.com** | https://www.makeareadme.com/ | Yes — WebFetch + screenshot | `docs/research/forge/readme-skeleton-generator/makeareadme.webp` |
| **MarkdownMe README Generator** | https://markdownme.com/tools/readme-generator | Yes — WebFetch + screenshot (was flagged unreached in the landscape survey; confirmed reachable this pass) | `docs/research/forge/readme-skeleton-generator/markdownme-readme-generator.webp` |

No competitor was invented or added beyond the landscape survey's three; all three were actually visited in this pass (readme.so via both landing and `/editor`, since the interactive product lives on the sub-route, not the marketing page).

## 3. Feature inventory

**readme.so** — the actual interactive competitor.
- Core strength: a **28-section picker** (Title and Description, Badges, Table of Contents, Installation, Usage/Examples, Features, API Reference, Contributing, License, Authors, Acknowledgements, Screenshots, Roadmap, Support, Deployment, Environment Variables, Running Tests, FAQ, Color Reference, Demo, Documentation, plus GitHub-profile-flavored ones: About Me, Skills, Links, custom sections). Click a section in the sidebar → it's added to the document.
- Each section ships with **pre-filled placeholder markdown** (e.g. Title and Description arrives with `# Project Title` + a description line already in the editor) — the user edits placeholder text rather than starting from nothing.
- Dual **Editor/Preview** pane: left is a raw markdown textarea per active section, right is rendered HTML, updating live, no button.
- **Reset** to clear all sections; drag-handle icons (`⠿`) on each active section imply reordering.
- Single **Download** button (top right) — no visible in-page "copy to clipboard" control; getting the raw text otherwise means the Raw tab + manual select.
- Open source (`octokatherine/readme.so` on GitHub), single named creator, no login, no ads.
- Upsell padding: none observed — the tool is genuinely single-purpose.

**makeareadme.com** — not a generator; the reference guide.
- A static article: README 101 Q&A, a copy-pasteable example template (raw + rendered), a prose "Suggestions for a good README" section, FAQ, and a "What's next" links list (Typora, StackEdit, Dillinger, MkDocs, Docusaurus, GitBook, Read the Docs, shields.io, asciinema, choosealicense.com).
- Its value is **prescriptive structure** (what belongs in a README and why), not interactivity. No form, no button, no output — this confirms it as content authority, not a competitor to build against, exactly as flagged going in.

**MarkdownMe README Generator** — a lead-gen tool embedded in a much larger SEO doorway site.
- Form fields: Project Name (required), Author, Description, Installation, Usage, Features, Contributing, License (dropdown: MIT/Apache-2.0/GPL-3.0/BSD-3-Clause/ISC/None), Badges (checkboxes: License/Version/Build Status).
- Single **"Generate README"** button — no live preview; result appears only after the click.
- Explicitly markets **client-side-only processing** ("runs entirely in your browser, so your content is not sent to a server") — this matches our own privacy stance and is worth keeping as a stated claim, not just an implementation detail.
- No login, no ads on the tool page itself — but the page sits inside a **massive footer link farm**: seven wide columns of "Converters / Generators / Analysis / Formatters / Utilities / Tools by audience / Tools by task", roughly 150+ doorway links to other single-purpose generators on the same domain, plus a fixed top banner ("Need AI training? CloudYeti.io/meet") and cross-sell buttons to the site's Jira/GitHub/X-Twitter/LinkedIn-AI tool family. The generator itself is clean; the site around it is a doorway farm.

## 4. Journey maps

**readme.so** (the one to beat):
1. Land on marketing page → single "Get Started" CTA → `/editor`.
2. Editor opens with **one section pre-loaded** (Title and Description) and its placeholder text already rendered in the live preview on the right.
3. User clicks section names in the left sidebar to add more (search box available for the 28-section list); each click appends placeholder markdown into the editor pane immediately — no per-section "add" confirmation, no modal.
4. User edits the raw markdown for the currently-selected section directly in the editor pane (center); the preview pane (right) updates live, no run button anywhere in this flow.
5. Preview/Raw toggle lets the user see rendered HTML or the underlying markdown for the whole document.
6. Exit is **Download** only, as a `.md` file — no visible copy-to-clipboard affordance in the captured UI.
7. No error states observed — an empty document just shows nothing; there is no invalid input to reject since it's all free-text markdown.

**makeareadme.com**: no journey — read the guide, copy the static template block manually. Confirms it is not a generator.

**MarkdownMe**: form top-to-bottom (all fields optional except Project Name) → click "Generate README" → result appears post-click (not observed whether copy/download, but the flow is gated on a button, unlike readme.so's live update) → FAQ states "fill in only the sections you need and the rest will be omitted" — i.e., it deliberately drops empty sections rather than emitting empty headers.

## 5. Layout + screenshots

- **readme.so editor**: three-column layout, roughly equal width. Left = section list (scrollable, "click to add" affordance below the active-sections list). Center = raw markdown editor for the active section. Right = live rendered preview. Top bar: logo + global Download button only — no options row, no settings drawer. Everything needed is above the fold at 1440×900. See `readme-so-editor.png`.
- **MarkdownMe**: single centered column, ~600px wide, classic top-to-bottom form. Above the fold: title, one-line description, Project Name + Author (two-column), then long single-column stacked textareas (Description/Installation/Usage/Features/Contributing), License dropdown + Badges checkboxes, then the Generate button. Below the fold: a "next useful step" cross-sell card, FAQ, Related Tools cards, an "About" blurb, and then the aforementioned multi-hundred-link footer farm. See `markdownme-readme-generator.png`.
- **makeareadme.com**: long-form article layout, no app chrome. See `makeareadme.png`.
- Mobile: not directly observed for any of the three (screenshots taken at desktop viewport); readme.so's three-column layout is the one likeliest to need real mobile rework (stacked accordion of section-list / editor / preview).

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- `docs/research/forge/readme-skeleton-generator/readme-so-landing.webp`
- `docs/research/forge/readme-skeleton-generator/readme-so-editor.webp`
- `docs/research/forge/readme-skeleton-generator/makeareadme.webp`
- `docs/research/forge/readme-skeleton-generator/markdownme-readme-generator.webp`

## 6. Their debt

- **readme.so**: no debt to speak of on the workflow itself. The only soft gap: no copy-to-clipboard button, and no machine API (it's a pure client SPA with no documented endpoints) — a model cannot call it, only a human can.
- **makeareadme.com**: not a tool, so no workflow debt; but its own "What's next" section funnels traffic to third-party doc generators, meaning even the reference authority doesn't try to be the generator.
- **MarkdownMe**: the generator itself is clean and honestly labeled (client-side, no upload), but it is one page inside a doorway-link megasite — top banner ad for an unrelated consulting product ("CloudYeti.io/meet"), and a footer with what appears to be 150+ generated tool links across seven categories, several looking templated/programmatic rather than hand-curated. Button-gated result (no live preview) is also a real UX regression versus readme.so.

## 7. Domain know-how

1. **Omit empty sections, don't emit empty headers.** MarkdownMe states this explicitly as a FAQ answer — a naive template-string implementation that always prints every section header (even with blank body) produces a visibly broken README. Toggled-off / never-filled sections must not appear at all.
2. **GitHub's heading-to-anchor slugification is specific**: lowercase, spaces → hyphens, strip most punctuation, and — critically — duplicate headings get a `-1`, `-2` suffix. A hand-rolled Table of Contents that just lowercases-and-hyphenates will silently produce dead anchor links the moment two sections share a word, or the doc has a heading with parentheses/backticks in it.
3. **The LICENSE section should reference, not duplicate, the license.** Standard practice (per makeareadme.com's own guidance) is a one-line SPDX-style pointer ("This project is licensed under the MIT License — see the LICENSE file for details"), not pasting full license text into the README. A naive generator that dumps the full MIT/Apache text into the README body produces a bloated, wrong-looking document — full license text belongs in a separate `LICENSE` file (which is a different tool: our own license-generator).
4. **Badge markdown via shields.io has a specific, easy-to-get-wrong URL grammar** (`![label](https://img.shields.io/badge/<label>-<message>-<color>)` for static badges, versus dynamic badges like `https://img.shields.io/npm/v/<pkg>` for live package data) — plus a separate `logo=<simple-icons-slug>` parameter for tech-stack icons. Getting this wrong renders a broken image icon in the preview, which is an embarrassing first impression for a README tool specifically.
5. **Code fences need a language tag** (` ```bash `, ` ```ts `) for GitHub to apply syntax highlighting to install/usage snippets — a plain ` ``` ` fence renders unstyled and looks unfinished on the actual GitHub page even though it's valid markdown.
6. **GitHub-flavored markdown has extensions CommonMark renderers don't**, notably the 2023-era **alert callouts** (`> [!NOTE]`, `> [!WARNING]`, etc.) — none of the three competitors surfaced these, which is a small, real gap: a modern README skeleton tool that offers a "Note" or "Warning" callout block as one of its section types is doing something none of the three researched competitors do.
7. **"README" is overloaded with GitHub-profile READMEs** (the special repo named after your own username, rendered on your profile page) — readme.so explicitly serves both (it has About Me / Skills / Links section types). That is a different JTBD (personal branding, not project documentation) and pulling it in dilutes the tool; the empty-root candidate list in §6.7.9 names this tool "README skeleton" for **project** documentation specifically.

## 8. Chosen archetype

Per §6.7.9's own Template-root candidate list, "README skeleton" sits alongside `.gitignore` by stack and license chooser — both explicitly Configure-then-generate examples ("the options *are* the product; output regenerates as they change"). That is exactly what readme.so already proves works for this job: there is no "Generate" button anywhere in its editor; toggling a section or editing its text updates the live preview immediately.

Why the other six are wrong here:
- **Instant transform** — doesn't fit: there's no single input string being transformed; the "input" is a structured set of section choices plus free text per section, not one paste-box.
- **Decision wizard** — the user isn't confused about what they want (they know they want a README); they want to assemble it fast, not be interrogated step-by-step. A wizard would add friction MarkdownMe already demonstrates is a downgrade (button-gated, one-shot).
- **Drop-and-verdict** — there's no file to drop and no single verdict to render; this is an authoring tool, not an inspector.
- **Two-pane compare** — nothing is being diffed or compared.
- **Inspect-and-drill** — there's no existing artifact to explore; the user is producing a new document, not decoding one.
- **Batch queue** — single document, single user, no async/multi-file case.
- **"Form + button"** (generic form runner) is the one real trap here, and MarkdownMe is the live cautionary example: its button-gated form is a strictly worse experience than readme.so's live regeneration for the exact same job, with no compensating benefit. Configure-then-generate is form + button's antidote for this tool: same input surface, but no artificial step tax.

## 9. Our design

### 9.1 Journey

*This brief writes the journey inline in 9.2 Layout rather than as a separate step sequence — carried into §11 as an open item.*

### 9.2 Layout

**Layout** — two-pane, not three: this tool's "product" is the assembled document, and the section list itself is where editing happens (readme.so's 3-pane split between "raw text of active section" and "which sections exist" is more surface area than the job needs).

- **Left pane — section checklist** (grouped, not one flat alphabetical list like readme.so's sidebar): groups are *Core* (Title & Description, Badges, Table of Contents, Installation, Usage), *Docs* (Features, API Reference, Screenshots/Demo, Roadmap), *Community* (Contributing, Support/Contact, Acknowledgements), *Meta* (License, Authors, Tech Stack). Each row is a toggle; toggling on reveals inline fields for that section directly in the row (no separate click-to-select-then-edit-elsewhere step readme.so requires) — e.g. toggling "Installation" reveals a package-manager-command field plus a language-tag dropdown for the fenced code block.
- **Right pane — live rendered preview** with a **Preview / Raw** switch (mirrors readme.so, since it's the right idea) and two persistent actions pinned above it: **Copy markdown** and **Download README.md** (closing readme.so's copy gap).
- **Defaults on arrival**: Title & Description, Installation, Usage, License pre-toggled on (the 80% case per makeareadme.com's own "suggestions" list); everything else starts off, so the first paint is already a usable, non-empty skeleton — never a blank page.
- **No Generate button anywhere** — every keystroke or toggle re-renders the right pane immediately.
- **Big input / edge case**: if a user pastes a very long usage example or many tech-stack badges, the preview pane scrolls independently of the section list (no reflow of the whole page); there's no hard limit since everything stays client-side text.
- **Error state**: an empty Project Name never blocks rendering — falls back to a `Project Title` placeholder exactly like readme.so, so the preview is never in a broken state.
- **Toggling a section off removes it from the output immediately** and — critically, per the domain know-how above — never leaves a stray empty header behind.

### 9.3 Must-have

**Must-have features** (without these, a user bounces back to readme.so):
1. Live, no-button regeneration on every edit/toggle.
2. A section checklist covering the common project-README anatomy (not just a fixed 5-field form like MarkdownMe).
3. Both copy-to-clipboard and file download.
4. Never emit an empty header for a toggled-off/blank section.

### 9.4 Deliberately skipped

**Deliberately skipped** (and why):
- **GitHub-profile-README section types** (About Me, Skills, Links, Introduction) — different JTBD (personal branding vs. project docs); readme.so blends these in, we don't, per domain know-how #7.
- **Free drag-to-reorder of sections** — readme.so implies this via drag handles; we use a fixed, sensible section order (matching the anatomy makeareadme.com itself recommends) with on/off toggles only. Simpler, fully deterministic, and trivially agent-composable (a fixed order means the API output is stable given the same input set) — reordering can be revisited later if users actually ask for it, but it is not in the must-have set.
- **AI-generated description/usage copy** — MarkdownMe's parent site pushes adjacent "AI content" tools; we stay `pure`/deterministic for this tool so it needs no Router hop, no model meter, and stays reproducible for agents.
- **Full license text embedding** — belongs to the separate license-generator tool; we only emit the one-line SPDX pointer plus a `compose.next` edge to it.

### 9.5 Differentiator

- **Agent contract**: same skeleton-assembly logic is callable via OpenAPI + MCP — an agent scaffolding a new repo can request a README body from structured fields (project name, description, install command, license SPDX id, tech stack) and get back markdown it can write straight to disk, something none of the three competitors expose (readme.so is a closed SPA with no API; MarkdownMe and makeareadme.com are human-only pages).
- **No doorway-farm debt**: unlike MarkdownMe, the tool page carries no footer link farm, no unrelated consulting-service banner ad, and no button-gated wait — matches readme.so's clean single-purpose page instead.
- **Both copy AND download**, closing readme.so's one real gap (no visible copy-to-clipboard).
- **Composable with sibling Forge tools**: license section links forward to our own license generator/chooser output rather than re-implementing license-text logic inline (`compose.next: [generator/license-file]`), and badge section can pull live package/build-status conventions consistent with our badge-family tools, instead of readme.so's static placeholder badges.
- **Deterministic and `pure`** — no LLM writes the description or usage text for the user (some competitors' surrounding ecosystems push "AI content" tools next to their README generator; we deliberately do not, keeping this tool zero-cost, reproducible, and agent-composable without a Router hop).

### 9.6 I/O contract

**I/O contract sketch** (for the OpenAPI/MCP surface, §6.5 gate 2):

```text
input:
  projectName?: string
  description?: string
  sections: array<enum: title, badges, toc, installation, usage, features,
                   api-reference, screenshots, roadmap, contributing,
                   support, acknowledgements, license, authors, tech-stack>
  installCommand?: string
  usageExample?: string
  license?: string          # SPDX id, e.g. "MIT" — renders a one-line pointer only,
                             # never full license text (see domain know-how #3)
  badges?: { npmVersion?: bool, buildStatus?: bool, license?: bool }
  techStack?: array<string>  # simple-icons slugs for badge logos

output:
  markdown: string
  sectionsIncluded: array<string>   # confirms which requested sections actually rendered
sideEffect: pure
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — research-only brief |
| 6 | Side-effect class declared | Declared `pure` in this brief |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (named, reached, captured) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

**内部验收状态：** `research-complete` — teardown on file per §6.7.10 gate 11; archetype chosen (gate 12); implementation not started (research-only pass, no application code touched).

## 11. Gaps and open questions

- [ ] **MarkdownMe's post-generation exit path was not observed** (§4) — the
      flow is button-gated, and whether the result offers copy, download,
      both, or neither is unknown. "We close a copy gap none of them close"
      (§9.5) is therefore only firmly established against readme.so, whose
      download-only exit *was* seen.
- [ ] **readme.so's copy gap is a capture-based claim** — no copy-to-clipboard
      affordance was visible in the captured editor UI, which is not the same
      as confirming none exists (e.g. behind a hover or a keyboard shortcut).
      Re-check interactively before using it as a public comparison point.
- [ ] **Only three competitors, one of which is not a generator.**
      makeareadme.com is a reference article and readme.so is the single real
      interactive competitor; the competitor set here is thinner than the
      §6.7.10 "3–5 by actual reach" target in practice, even though three
      names are listed. Worth one more SERP pass for a genuine third
      interactive competitor before build.
- [ ] **Mobile behaviour unverified** for all three (desktop captures only).
- [ ] **The journey is written inline in §9.2 rather than as an explicit step
      sequence** (§9.1) — write it out before implementation.
- [ ] **GitHub's own anchor-slugification rules** are the load-bearing detail
      for the TOC feature (§7) and are stated here from domain knowledge, not
      from a cited GitHub spec page. Verify against GitHub's live rendering
      before shipping generated TOC anchors.
- [ ] **Meter id, error codes and privacy note are not yet decided**
      (§10 gates 5, 7, 8). Side effect is declared `pure` in §9.6.
