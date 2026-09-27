# Sailor Studio — a project's look is chosen, not edited

- **Status**: Accepted
- **Date**: 2026-09-27
- **Owner**: Tseka Luk
- **Related**: ADR 2026-09-24 Sailor convergence (zero-question scaffold, one CLI trunk),
  ADR 2026-09-08 product intelligence phase (one canonical implementation per domain),
  `packages/design/theme` (Brand Packages), `apps/landing/src/site-map.ts`

## Context

A project scaffolded from Sailor could change its look six ways, and none of them ended in the
project:

| Path | What it did | Where it stopped |
| --- | --- | --- |
| `brand:init` → `brand:apply` | name, company, domains | colours only by hand-editing `brand.config.ts` |
| `brand:palette` | two colours → a palette block | printed code to paste |
| `nebutra theme` | `list`, `inspect` | the catalog advertised `nebutra theme use <id>`, which did not exist |
| `apps/web` `/theme-playground` + Appearance → theme editor | pick, import, edit, copy a language | the viewer's browser, or a DESIGN.md on the clipboard |
| `brand-genesis quickstart` | AI brand generation | its own output format |
| `apps/design` | token and component pages | self-described verifier scaffold |

Each ended with a person, or a coding agent, editing the repository. The owner's position: a
project's look is decided in an interface and applied with one command; nobody hand-edits the
design system after `init`.

The field converged on the same shape in 2026. shadcn/create builds a whole design-system setup
visually and packs it into a preset code; `shadcn create --preset` scaffolds with it and
`shadcn apply --preset [--only theme|font]` re-applies it later. tweakcn installs an edited theme
with one `shadcn add`. 21st.dev is a catalog of 12,000+ components, themes and templates, each with
a live preview and an install command. Radix Themes reduces a theme to a few knobs (accent, gray,
radius, scaling).

## Decision

1. **Sailor Studio is the one place a project's look is chosen.** It is a Nebutra-hosted tool on
   the Nebutra site under the Sailor section (`/sailor/studio`), free and without sign-in, and it is
   stripped from the template like the rest of the site. It starts from the `/theme-playground`
   workbench (language registry, preview canvas, token inspector, DESIGN.md import/export) and
   adds the pieces it lacked: knobs, a preset code, and the commands that apply it.

2. **Knobs over a base language, not a token sheet.** A look is a Brand Package: a base language
   (factory or one of the catalog languages) plus a small set of overrides that the emit pipeline
   expands into every role, scale, recipe and mode:
   brand colour (`roles.action` / `ring`), neutral temperature (canvas, surface, muted hue),
   radius scale (`recipe.radii`), density (`recipe.density`), sans and mono families,
   heading weight, dark default. Anything finer stays the base language's decision.

3. **A preset is a short code.** The base-language id and the overrides are bit-packed (56 bits,
   version in the lowest three) and written in base62: about ten characters, no server, decoded the
   same everywhere. Every knob indexes an append-only list, so a published code never changes
   meaning. The codec and resolver live in `@nebutra/tokens/preset` (pure; the tokens build, the
   CLI, create-sailor and Studio's browser preview all use it) and ship in the template. Tests pin
   the round trip for every value of every knob and resolve every base language.

4. **Two commands apply it, and nothing else writes the design system.**
   - `create-sailor <dir> --preset <code>`. With no preset the look is factory, so the scaffold still
     asks nothing.
   - `nebutra apply --preset <code> [--only theme|fonts]` in an existing project.

   Both write one file, `packages/design/tokens/project/preset`: the code itself. The tokens build
   (`scripts/emit-project.mjs`) resolves it over the base language and writes `project.css`, which
   every stylesheet that loads `@nebutra/tokens/styles.css` loads right after
   (`tests/architecture/project-look.test.ts`), and `src/project.generated.ts`, from which
   ThemeProvider takes the project's default mode. A language with one palette locks the site to
   that mode, so the other mode cannot fall through to the House tokens.
   `project/brand.json`, hand-authored, takes precedence over the code: the declared escape hatch.
   Before this, `preset.config.ts`'s `theme` reached only an environment variable nothing read, so a
   project had no working way to wear a language at all.

   Identity (name, company, domains, logo) stays with `brand:init` / `brand:apply`. The catalog's
   `install.command` becomes `nebutra apply --preset <id>` (a language id is a preset), and the
   non-existent `nebutra theme use` goes.

5. **Studio previews the site you get.** The preview renders the template's real pages (`/acme`)
   and the dashboard sample panels in the chosen look, not swatches.

6. **The product apps keep only the viewer's own preferences.** `apps/web` loses `/theme-playground`
   and Appearance's theme editor (preset picker, import, copy, per-token rows). Light/dark mode,
   cursor, motion, font sizes, diff markers and smoothing stay: they belong to the person using the
   product, not to the brand.

7. **Catalog, then community (21st's shape).** The first phase covers the design languages. Blocks
   and templates enter the catalog later, each with a preview and an install command. Publishing
   and an MCP search endpoint come after that. An agent can find and apply a preset, and applying
   one is still the command, not an edit.

## Consequences

- `brand:palette` and `apps/design` retire once Studio covers them. `brand-genesis quickstart` is
  reviewed against Studio before it is kept or retired.
- The template ships the preset codec and the two commands; it does not ship Studio.
- A project that wants a look Studio cannot express edits its `brand.json`, which is the one
  file and the declared escape hatch, and runs `pnpm brand:apply`. That is an exception, not the
  path.

## Phases

1. Remove `/theme-playground` and the theme editor from `apps/web`; move the workbench into
   the Nebutra site as Studio's starting point.
2. `@nebutra/theme/preset` codec + `nebutra apply --preset` + `create-sailor --preset`.
3. Studio: knobs, preset code and command, `/acme` preview, catalog pages.
