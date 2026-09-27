# nebutra.com — design

The Nebutra-owned shell of `apps/landing`. The Sailor template never ships
this directory; it keeps the top-nav site.

**Sections, names and page ownership live in `src/site-map.ts`**, and a test
checks it against the app directory. This document holds the reasons and the
rules. The map holds the facts.

## Thesis (agreed 2026-09-27)

The site is media first. The founder's thinking leads, because it is the most
mature and least copyable thing Nebutra has.

- **Journal** is the essays, and it is the front page.
- **Sailor** is the platform, usable today. The old landing's home tells Sailor's
  story, so its sections become the Sailor page. The template keeps that same
  content as its own home.
- **Sleptons** is the ecosystem where people, ideas, needs and capital meet.
  **Ideas**, the UGC of ideas and needs, belongs here. It is not the essays.
- **Building** covers Nebutra OS and the products grown on the platform. They are
  listed plainly, not shown off as a portfolio. They are early, and the site
  does not pretend otherwise by staging them as wins.
- **Company** covers who we are, how we work, contact and legal.

References:

- a16z's layout: institution, media first, a left rail
- basement's positioning
- Vercel's spec
- Cursor's detail
- Linear's grayscale with the Nebutra VI gradient as a signature: one word per
  screen, via `--brand-decorative-signature` from the `nebutra-site` Brand Package

## Rules learned the hard way

Each of these was a correction from the owner. Do not relearn them.

- **No mocks.** Show real things or nothing. The "Loop" generation demo was a
  fake of a product that does not exist yet. The Sailor page instead replays a
  real, dated run of `npx create-sailor`. Re-record it when the CLI output
  changes.
- **No maintenance metrics.** PRs per month, commit heatmaps and live PR feeds
  read as maintenance cadence to a visitor, not as proof.
- **No labels that carry no information.** A field whose only value is "Early"
  on every product only diminishes them.
- **Official brand assets.** The mark and wordmark come from `@nebutra/brand`
  (`Logo variant="en"`, `Logomark variant="mono"`, reversed on the void). Never
  type the name in a font.
- **Wheels first.** Pages compose design-system parts:
  - `SidebarNav`, collapsible, with icons
  - `Heading`
  - `Terminal`
  - `Grid`
  - `FilterPills`
  - the editorial blocks

  When a part is wrong, fix the part: Grid's responsive columns, Heading's weight,
  Terminal's overflow and GitHubCalendar's dark cells were all fixed in the
  library, not worked around in a page.
- **No "AI look".** No mono uppercase micro-labels everywhere, and no two-tone
  headline template. Numbers go in sentences, not stat tiles. Copy is the
  founder's own words from the Journal.
- **Names are decided in the site map.** "Ideas" drifted onto the essays because
  the naming lived in conversation. It lives in `site-map.ts` now.

## Layout

- **Rail:** `SidebarNav` from `site-map.ts` sections, with icons, collapsing to
  icons with the mono mark. The collapse state is a per-viewer localStorage
  convenience.
- **Page opening:** `Intro` (Heading display, plain lead, Chinese line). The
  section band is `Band` (hairline, Linear's 128px rhythm).
- **Paths:** every section is served at its site-map path (`routes.ts` reads
  them). The frame is `src/site-shell.tsx`: this rail on the Nebutra site, the
  top-nav chrome in the template (`site-shell.for-template.tsx`).
