# UI catalog — one description of @nebutra/ui, one home for its demos

- **Status**: Accepted
- **Date**: 2026-09-27
- **Owner**: Tseka Luk
- **Amends**: ADR 2026-05-14 registry dual-track distribution (the registry track)
- **Related**: ADR 2026-09-27 Sailor Studio, ADR 2026-09-08 product intelligence phase
  (one canonical implementation per domain)

## Context

`@nebutra/ui` was described in four places, and each had drifted from the code
and from the others:

| Where | What it held | State on 2026-09-27 |
| --- | --- | --- |
| `packages/design/docs-shared/src/components/previews` | 201 demos | its one consumer was sailor-docs; its other consumer, design-docs, was deleted |
| `apps/sailor-docs/src/components/previews` | 292 files: 197 two-line re-exports of the above, 95 local demos | rendered by no page: no MDX file in the docs uses a single demo |
| `apps/sailor-docs/public/r` + `registry.json` | 290 shadcn items built from those previews | `registryDependencies: ["@nebutra/ui"]` names no registry item, so none installs; the docs site answers 404 for every `/r/*.json` |
| `packages/design/ui/scripts/build-registry.ts` | 66 hand-written component specs with inline token copies | writes to `apps/design-docs`, which no longer exists |

The library itself carried the consequences. Of 205 files in `primitives/`, 118
had no caller in any app or package. Four "demos" rendered a docs-local
`ScrollArea` that the library does not ship. Five tooltip demos showed a
second tooltip (`GeistTooltip`) instead of the one apps use. Two `Terminal`s,
two `BentoGrid`s, a `menu` beside `dropdown-menu`, `modal` beside `dialog`,
`collapse` beside `collapsible`, `note` beside `alert`, `multi-select` beside
`multiple-selector`, and three badge families existed side by side. Nobody could
say what the library contained or how to use most of it — the owner's words:
some parts were simply forgotten.

## Decision

1. **The catalog is a typed manifest in the package**:
   `packages/design/ui/src/catalog/manifest.ts`, exported as
   `@nebutra/ui/catalog`. Each entry names a component (`id`, `title`), its
   category (thirteen, 21st.dev's shape: actions, forms, overlays, navigation,
   data display, feedback, layout, charts & maps, AI, marketing, media,
   backgrounds & effects, text & motion), its status, the entry point an app
   imports it from, the source files it owns and its demos. Shared building
   blocks that are not components (`overlay`, `form-control`, …) are listed in
   `INTERNAL_FILES`.

2. **Demos live next to the library**, in `src/catalog/demos/`, one exported
   component per file, named `<entry-id>[-variant]-demo.tsx`, importing the
   library by its public names (`@nebutra/ui/primitives`), never by relative
   path — a demo is the code a reader copies. The package typechecks them, so a
   demo breaks when the API it shows changes. Each builds to its own chunk and
   loads through `DEMO_LOADERS` (generated, literal `import()` per demo).

3. **Status is measured, not declared.** `stable`: something outside the library
   imports it. `experimental`: nothing does yet; it is shown, not promised.
   `tests/architecture/ui-catalog.test.ts` recomputes the callers and fails when
   an entry's status is wrong in either direction.

4. **Guards hold the manifest to the tree** (`src/catalog/__tests__`): every
   component file has exactly one owner; every demo exactly one entry, named
   after it; the loader table is current. An entry without a demo is allowed
   only while it sits on a shrink-only list.

5. **Surfaces read the manifest; none keeps its own list.** Sailor Studio renders
   the catalog under the chosen look. The registry serves each demo as a shadcn
   `registry:example` from the Nebutra site. Agents search the same manifest.
   sailor-docs documents the product and carries no component demos.

6. **The copy-source registry track is retired.** In a Sailor project
   `@nebutra/ui` is already a workspace package: a component is imported, and
   its demo is what gets copied. Copying component source with hand-made token
   copies (the 2026-05-14 track) produced a second implementation per component
   and was never served. The npm track of that ADR stands.

## Consequences

- `@nebutra/docs-shared` is gone; sailor-docs keeps the six MDX helpers it
  renders. sailor-docs' preview registry, `__registry__`, `ComponentPreview` and
  its demo imports are gone, which also takes ~300 client modules out of the docs
  Worker bundle.
- Orphans and losing duplicates were deleted rather than catalogued (list in the
  PR). Components with no caller that a SaaS scaffold needs and nothing else in
  the repo provides (`DataTable`, `Stepper`) stay as experimental and get demos.
- `apps/design` keeps its token and foundation pages. Its component pages and
  their 33 demos are the last duplicate description; they retire once Studio's
  catalog covers them (ADR Sailor Studio, consequences).
- A new component lands with a manifest entry and a demo, or it does not land.
- Studio's Components view renders the catalog in a same-origin frame
  (`/sailor/studio/frame`), so the look covers the whole document — overlays
  portal to its `<body>` — and device widths are real media queries. That page
  is the site's one framing exception: `X-Frame-Options: SAMEORIGIN` and
  `frame-ancestors 'self'` for that path, `frame-src 'self'` for the Studio page,
  `DENY` / `'none'` everywhere else (`apps/landing/src/lib/security/framing.ts`,
  held by `security-headers-consistency.test.ts`).
- The registry is served by the Nebutra site at `/r/registry.json` and
  `/r/<demo>.json` from demo sources the ui build ships as data
  (`@nebutra/ui/catalog/sources.json`); it is not part of the template.
- `@nebutra/ui/catalog` is data only and safe on a server; demo components load
  through `@nebutra/ui/catalog/loaders`.
