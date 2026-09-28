# project/

This project's look. Choose it in Sailor Studio and apply it with one command:

```bash
nebutra apply --preset <code>     # writes project/preset, rebuilds the tokens
```

- `preset` — the preset code (ADR 2026-09-27 Sailor Studio). The only file a
  project normally has here.
- `brand.json` — a hand-authored Brand Package, for a look Studio cannot
  express. It takes precedence over `preset`. The declared escape hatch, not
  the path.
- Neither — factory: the House tokens in `styles.css`, unchanged.

The tokens build (`scripts/emit-project.mjs`) turns this into `project.css`,
which every app imports right after `styles.css`, and
`src/project.generated.ts`, which sets ThemeProvider's default mode. Do not edit
either by hand.
