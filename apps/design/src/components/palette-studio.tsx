"use client";

import { Input } from "@nebutra/ui/primitives";
import * as React from "react";
import { generatePalette, hexToOklch, normalizeHex, oklchToHex } from "@/lib/color";
import { ModeFrame, Section } from "../app/(tokens)/tokens/_components/primitives";
import { PaletteExport } from "./palette-export";
import { PaletteModePanel } from "./palette-mode-panel";
import { PalettePreview } from "./palette-preview";

// @primitive-exempt: the seed chips are bare colour hit targets painted in the colour they pick.

/**
 * Starting hues, as OKLCH rather than hex: one lightness, one chroma, the hue
 * walked around the wheel, then gamut-mapped. They are a way in, not a brand.
 */
const HUES = [
  { label: "Red", h: 25 },
  { label: "Orange", h: 55 },
  { label: "Amber", h: 85 },
  { label: "Lime", h: 125 },
  { label: "Green", h: 155 },
  { label: "Teal", h: 185 },
  { label: "Cyan", h: 215 },
  { label: "Blue", h: 255 },
  { label: "Violet", h: 290 },
  { label: "Magenta", h: 335 },
] as const;

const NAME_RE = /^[a-z][a-z0-9-]*$/u;

/**
 * The OKLCH palette generator.
 *
 * One seed colour in, twelve steps out for light and for dark, each measured
 * against the pairings it is meant for. The seed round-trips through the URL
 * (`?seed=rrggbb`) so a palette can be linked to.
 */
export function PaletteStudio({ defaultSeed }: { defaultSeed: string }) {
  const [text, setText] = React.useState(defaultSeed);
  const [name, setName] = React.useState("brand");

  const seed = normalizeHex(text);
  // The last valid seed keeps the page whole while a hex is half-typed.
  const lastValid = React.useRef(defaultSeed);
  if (seed) lastValid.current = seed;
  const active = seed ?? lastValid.current;

  const palette = React.useMemo(() => generatePalette(active), [active]);
  const safeName = NAME_RE.test(name) ? name : "brand";

  React.useEffect(() => {
    const fromUrl = normalizeHex(new URLSearchParams(window.location.search).get("seed") ?? "");
    if (fromUrl) setText(fromUrl);
  }, []);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", active.slice(1));
    window.history.replaceState(null, "", url);
  }, [active]);

  const seedOklch = hexToOklch(active);
  const presets = React.useMemo(
    () => HUES.map((hue) => ({ ...hue, hex: oklchToHex({ l: 0.58, c: 0.19, h: hue.h }) })),
    [],
  );

  return (
    <>
      <Section
        note={
          <p>
            Pick the colour that should be the solid fill — step 9, the one buttons and badges wear.
            The other eleven are derived from its hue and chroma.
          </p>
        }
        title="Seed"
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,14rem)_minmax(0,14rem)] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground text-xs" htmlFor="palette-picker">
                Colour
              </label>
              <input
                aria-label="Seed colour picker"
                className="h-10 w-full cursor-pointer rounded-md border border-border bg-transparent p-1 sm:w-16"
                id="palette-picker"
                onChange={(event) => setText(event.target.value)}
                type="color"
                value={active}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground text-xs" htmlFor="palette-hex">
                Hex
              </label>
              <Input
                aria-invalid={seed ? undefined : true}
                autoComplete="off"
                className="font-mono"
                id="palette-hex"
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
                value={text}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-muted-foreground text-xs" htmlFor="palette-name">
                Token name
              </label>
              <Input
                aria-invalid={NAME_RE.test(name) ? undefined : true}
                autoComplete="off"
                className="font-mono"
                id="palette-name"
                onChange={(event) => setName(event.target.value.trim())}
                spellCheck={false}
                value={name}
              />
            </div>
          </div>

          <p aria-live="polite" className="m-0 min-h-5 text-xs">
            {seed ? (
              <span className="text-muted-foreground tabular-nums">
                oklch {seedOklch.l.toFixed(3)} {seedOklch.c.toFixed(3)} {seedOklch.h.toFixed(1)}
              </span>
            ) : (
              <span className="text-destructive-strong">
                Not a hex colour — showing {lastValid.current} until it is. Use #rgb or #rrggbb.
              </span>
            )}
            {NAME_RE.test(name) ? null : (
              <span className="ml-3 text-destructive-strong">
                Token names use lowercase letters, digits and hyphens — exporting as "brand".
              </span>
            )}
          </p>

          <div>
            <p className="m-0 mb-2 text-muted-foreground text-xs">Start from a hue</p>
            <div className="flex flex-wrap gap-2">
              {defaultSeed ? (
                <button
                  aria-label="Use the Nebutra brand colour"
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setText(defaultSeed)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="size-3.5 rounded-full border border-border"
                    style={{ backgroundColor: defaultSeed }}
                  />
                  Nebutra
                </button>
              ) : null}
              {presets.map((preset) => (
                <button
                  aria-label={`Use a ${preset.label.toLowerCase()} seed`}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  key={preset.label}
                  onClick={() => setText(preset.hex)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="size-3.5 rounded-full border border-border"
                    style={{ backgroundColor: preset.hex }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        note={
          <p>
            Steps 1–2 are backgrounds, 3–5 component states, 6–8 borders, 9–10 solids, 11–12 text —
            the same meaning as <code className="font-mono">--blue-1…12</code> in the token source.
            Click a swatch to copy it as <code className="font-mono">oklch()</code>.
          </p>
        }
        title="Light"
      >
        <ModeFrame mode="light">
          <PaletteModePanel mode="light" steps={palette.light} />
        </ModeFrame>
      </Section>

      <Section
        note={
          <p>
            Dark is generated, not inverted: the solid is kept in a lightness band white text can
            sit on, and the text steps are pushed until they clear WCAG 2 on the subtle background.
            APCA is measured, not steered, so a Miss there is a real reading.
          </p>
        }
        title="Dark"
      >
        <ModeFrame mode="dark">
          <PaletteModePanel mode="dark" steps={palette.dark} />
        </ModeFrame>
      </Section>

      <Section
        note={
          <p>
            The same ladder used as the roles say: soft controls climb 3 → 4 → 5, solids 9 → 10, and
            the focus ring and callout are <code className="font-mono">color-mix()</code> of the
            solid.
          </p>
        }
        title="In use"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <PalettePreview steps={palette.light} />
          <PalettePreview steps={palette.dark} />
        </div>
      </Section>

      <Section
        note={
          <p>
            CSS puts light on <code className="font-mono">:root</code> and dark on{" "}
            <code className="font-mono">.dark</code>, the selectors this site switches on. The DTCG
            file stores each colour as OKLCH components with the hex it gamut-maps to.
          </p>
        }
        title="Export"
      >
        <PaletteExport name={safeName} palette={palette} />
      </Section>
    </>
  );
}
