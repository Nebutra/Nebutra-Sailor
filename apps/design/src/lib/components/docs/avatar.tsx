"use client";

import { Avatar } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

// Embedded fixtures make loaded and broken image states independent of a remote service.
const IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="28" r="14"/><path d="M12 80V68a28 28 0 0 1 56 0v12Z"/></svg>')}`;
const BROKEN_IMAGE = "data:image/png;base64,invalid";
const MODES = ["image", "initials", "broken", "placeholder"] as const;

function sizesOf({ axes }: DemoProps["derived"]) {
  return axes.size?.length ? axes.size : ["xs", "sm", "md", "lg", "xl"];
}

export function Playground({ derived }: DemoProps) {
  const sizes = sizesOf(derived);
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: sizes,
      defaultValue: sizes.includes("md") ? "md" : (sizes[0] ?? "md"),
    },
    { name: "mode", type: "select", options: MODES, defaultValue: "initials" },
    { name: "alt", label: "name", type: "text", defaultValue: "Ada Lovelace" },
    {
      name: "letter",
      type: "text",
      defaultValue: "",
      hint: "Optional initials override. Keep it to one or two characters.",
    },
    { name: "fallbackDelayMs", type: "select", options: ["0", "300", "700"], defaultValue: "0" },
  ];

  return (
    <ComponentPlayground
      caption="The embedded image loads without a network request. Broken image shows the same initials fallback; placeholder uses the component's loading shell."
      code={(v) => {
        const source = v.mode === "image" ? IMAGE : v.mode === "broken" ? BROKEN_IMAGE : undefined;
        return snippet({
          imports: [{ names: ["Avatar"], from: "@nebutra/ui/primitives" }],
          body: `${source ? `const avatarSrc = ${JSON.stringify(source)};\n\n` : ""}${jsx({
            name: "Avatar",
            defaults: { size: "md", placeholder: false },
            props: {
              role: "img",
              "aria-label":
                v.mode === "placeholder"
                  ? `Loading ${String(v.alt) || "avatar"}`
                  : String(v.alt) || "Avatar",
              alt: String(v.alt) || "Avatar",
              size: String(v.size),
              src: source ? raw("avatarSrc") : undefined,
              letter: String(v.letter).slice(0, 2) || undefined,
              placeholder: v.mode === "placeholder",
              fallbackDelayMs: Number(v.fallbackDelayMs) || undefined,
            },
          })}`,
        });
      }}
      knobs={knobs}
      render={(v) => (
        <Avatar
          alt={String(v.alt) || "Avatar"}
          aria-label={
            v.mode === "placeholder"
              ? `Loading ${String(v.alt) || "avatar"}`
              : String(v.alt) || "Avatar"
          }
          fallbackDelayMs={Number(v.fallbackDelayMs)}
          key={`${v.mode}-${v.fallbackDelayMs}`}
          placeholder={v.mode === "placeholder"}
          role="img"
          size={v.size as never}
          {...present({
            src: v.mode === "image" ? IMAGE : v.mode === "broken" ? BROKEN_IMAGE : undefined,
            letter: String(v.letter).slice(0, 2) || undefined,
          })}
        />
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={MODES.map((mode) => ({
        id: mode,
        label:
          mode === "broken"
            ? "Broken image"
            : mode === "placeholder"
              ? "Placeholder"
              : mode === "initials"
                ? "Initials"
                : "Loaded image",
      }))}
      note="Avatar has no disabled state. Loaded and broken fixtures are deterministic, initials come from the name, and placeholder is the library's explicit loading shell."
      render={(size, mode) => (
        <Avatar
          alt="Ada Lovelace"
          aria-label={mode === "placeholder" ? "Loading Ada Lovelace" : "Ada Lovelace"}
          placeholder={mode === "placeholder"}
          role="img"
          size={size as never}
          {...present({
            src: mode === "image" ? IMAGE : mode === "broken" ? BROKEN_IMAGE : undefined,
          })}
        />
      )}
      rows={sizesOf(derived).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
