"use client";

import { CopyButton, Toaster } from "@nebutra/ui/primitives";
import type * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

// CopyButton takes Button's variants and sizes; this page has no cva request of
// its own, so the lists mirror buttonVariants (button-variants.ts).
const VARIANTS = [
  "default",
  "ink",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
  "tertiary",
  "warning",
] as const;
const SIZES = ["tiny", "sm", "default", "lg"] as const;
const VALUE = "npm install @nebutra/ui";

const KNOBS: Knob[] = [
  { name: "value", type: "text", defaultValue: VALUE },
  {
    name: "label",
    type: "text",
    defaultValue: "Copy",
    hint: "Empty makes an icon-only button named by tooltipText.",
  },
  { name: "variant", type: "select", options: VARIANTS, defaultValue: "ghost" },
  {
    name: "size",
    type: "select",
    options: ["auto", "icon", ...SIZES],
    defaultValue: "auto",
    hint: "Auto picks icon without a label and default with one.",
  },
  {
    name: "iconType",
    type: "select",
    options: ["copy", "link", "code", "hash"],
    defaultValue: "copy",
  },
  {
    name: "iconPosition",
    type: "select",
    options: ["leading", "trailing"],
    defaultValue: "leading",
  },
  { name: "copiedLabel", type: "text", defaultValue: "Copied" },
  {
    name: "keepLabel",
    label: "copiedLabel (false)",
    type: "boolean",
    defaultValue: false,
    hint: "Keeps the label while copied. Use it when the label is the value.",
  },
  { name: "tooltipText", type: "text", defaultValue: "Copy" },
  { name: "timeout", type: "select", options: ["1200", "2000", "5000"], defaultValue: "2000" },
  { name: "showToast", type: "boolean", defaultValue: true },
  { name: "disabled", type: "boolean", defaultValue: false },
  { name: "loading", type: "boolean", defaultValue: false },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Click to copy; the real clipboard is written. The check, label swap, screen-reader announcement and toast all reset together after timeout. A label with the icon-only size would be squeezed, so size auto switches on whether there is a label."
      code={(v) => {
        const label = String(v.label);
        return snippet({
          imports: [{ names: ["CopyButton"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "CopyButton",
            defaults: {
              variant: "ghost",
              iconType: "copy",
              iconPosition: "leading",
              copiedLabel: "Copied",
              tooltipText: "Copy",
              timeout: 2000,
              showToast: true,
              disabled: false,
              loading: false,
            },
            props: {
              value: String(v.value),
              label: label || undefined,
              variant: String(v.variant),
              size: v.size === "auto" ? undefined : String(v.size),
              iconType: String(v.iconType),
              iconPosition: String(v.iconPosition),
              copiedLabel: label ? (v.keepLabel ? false : String(v.copiedLabel)) : undefined,
              tooltipText: label ? undefined : String(v.tooltipText),
              timeout: Number(v.timeout),
              showToast: v.showToast,
              disabled: v.disabled,
              loading: v.loading,
            },
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const label = String(v.label);
        return (
          <>
            {/* The site mounts no Toaster of its own; this one serves the showToast knob. */}
            <Toaster />
            <CopyButton
              disabled={Boolean(v.disabled)}
              iconPosition={v.iconPosition as "leading" | "trailing"}
              iconType={v.iconType as "copy" | "link" | "code" | "hash"}
              loading={Boolean(v.loading)}
              showToast={Boolean(v.showToast)}
              timeout={Number(v.timeout)}
              tooltipText={String(v.tooltipText)}
              value={String(v.value)}
              variant={v.variant as never}
              {...present({
                copiedLabel: v.keepLabel ? (false as const) : String(v.copiedLabel),
                label: label || undefined,
                size: v.size === "auto" ? undefined : (v.size as never),
              })}
            />
          </>
        );
      }}
    />
  );
}

/**
 * Makes the clipboard refuse for the length of one click, so the failed state
 * can be seen. The stub is an own property on `navigator` that shadows the real
 * getter and is deleted again as soon as the click has been dispatched.
 */
function RefusedClipboard({ children }: { children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stubs the clipboard around the child button's click; it is not a control itself
    <span
      onClickCapture={() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error("Refused by the preview")) },
        });
      }}
      onClick={() => {
        Reflect.deleteProperty(navigator, "clipboard");
      }}
      role="presentation"
    >
      {children}
    </span>
  );
}

const COLUMNS = [
  { id: "icon", label: "Icon only" },
  { id: "label", label: "Labelled" },
  { id: "trailing", label: "Icon trailing" },
  { id: "disabled", label: "Disabled" },
  { id: "loading", label: "Loading" },
  { id: "refused", label: "Write refused" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="Click an enabled cell to see the copied state: the check, then the label swap, held for two seconds. The last column makes the clipboard refuse for that click so the failed state (a warning icon) can be seen. Icon-only buttons name themselves from tooltipText."
      render={(size, column) => {
        const button = (
          <CopyButton
            disabled={column === "disabled"}
            iconPosition={column === "trailing" ? "trailing" : "leading"}
            loading={column === "loading"}
            showToast={false}
            size={size as never}
            value={VALUE}
            variant="outline"
            {...present({ label: column === "icon" ? undefined : "Copy" })}
          />
        );
        return column === "refused" ? <RefusedClipboard>{button}</RefusedClipboard> : button;
      }}
      rows={SIZES.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
