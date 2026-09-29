---
name: sailor-studio
description: Set a Sailor project's whole look — design language, brand colour, neutrals, radius, density, fonts, mode, logo tint — as one preset, show it to the person in Sailor Studio for approval, then pull it onto the project or start a new one with it. Use when asked to change the theme, brand, colours, fonts or overall look of a Sailor app, to "make it look like Linear / Vercel / Stripe", or to start a new Sailor project with a particular look. Not for editing individual components.
---

# Sailor Studio, from the agent

A Sailor project's look is **one preset**: a base design language plus a few
knobs. You write the preset; the person reviews it in the browser; then you
pull it. Never hand-edit `packages/design/tokens` to change the look — the
preset is the one input, and `nebutra studio pull` rebuilds everything from it.

## 1. Know what a preset may contain

```bash
nebutra studio schema          # JSON Schema; also served at <site>/studio/preset.schema.json
```

Only `base` is required. Omitted knobs keep the base's own value. Choose from
the listed values only — the CLI rejects anything else and names the field.

```json
{ "base": "linear", "brandColor": "#2e65ee", "radius": "lg", "sans": "Geist" }
```

Bases: `factory` (the House tokens), `linear`, `vercel`, `stripe`, `notion`,
`raycast`, `gsap`, `vanta`, `cosmos`. Start from the one closest to what the
person described, then change as few knobs as get there.

`tintLogo` stays off unless the person asks for a coloured logo: a language's
brand colour (Linear's lime) belongs to its own mark, not to their product.

## 2. Show it — always, before pulling

```bash
nebutra studio preview '<preset json>' --json
```

It returns `reviewUrl`, `code`, `apply` and `create`. Send the person the
`reviewUrl` and say what you chose and why, in one or two lines. Studio opens
on the look with a banner saying their agent proposed it; they can adjust it
there, and save it to their account if they want to keep it. You never save
for them — `nebutra studio list` / `pull --latest` read what they saved.

Wait for them. They answer "looks good" or paste back a `nebutra studio pull
<code>` command — if they adjusted the look in Studio, that command carries
their version, so use the code they paste, not yours.

## 3. Pull it

Existing Sailor project (run at its root):

```bash
nebutra studio pull <code>     # writes packages/design/tokens/project/preset and rebuilds the tokens
```

New project:

```bash
npx create-sailor@latest my-app --preset <code>
```

`--only theme` or `--only fonts` on `pull` changes one group and keeps the rest.

## MCP

The same three steps exist as tools on the `nebutra mcp` server:
`studio_preset_schema`, `studio_preview` (returns `reviewUrl`), and
`studio_pull` (writes the preset; then run `pnpm --filter @nebutra/tokens build`).

## Don't

- Pull without showing the review link first.
- Edit `packages/design/tokens/project/brand.json` by hand — it overrides every preset.
- Invent knob values, fonts or bases that the schema does not list.
