import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CheckGlyph, IndeterminateGlyph } from "./control-glyph";

const meta: Meta<typeof CheckGlyph> = {
  title: "Primitives/ControlGlyph",
  component: CheckGlyph,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The checkmark and dash drawn inside a checkbox. Both take `currentColor`, so the " +
          "control sets the colour once on its own element and the glyph follows — which is why " +
          "these are separate components rather than inline paths repeated per control.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckGlyph>;

export const Default: Story = {
  args: { size: 16 },
  render: (args) => (
    <span className="text-foreground">
      <CheckGlyph {...args} />
    </span>
  ),
};

export const BothGlyphs: Story = {
  name: "Check and indeterminate",
  render: () => (
    <div className="flex items-center gap-8 text-foreground">
      <figure className="flex flex-col items-center gap-2">
        <CheckGlyph />
        <figcaption className="text-xs text-muted-foreground">checked</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <IndeterminateGlyph />
        <figcaption className="text-xs text-muted-foreground">indeterminate</figcaption>
      </figure>
    </div>
  ),
};

export const Sizes: Story = {
  name: "Size ladder",
  parameters: {
    docs: {
      description: {
        story:
          "The viewBox is 16, so size 16 renders the stroke at 1:1. Away from 16 the stroke " +
          "scales with the glyph, which is the intended behaviour — a checkbox at 20px wants a " +
          "proportionally heavier tick, not a hairline.",
      },
    },
  },
  render: () => (
    <div className="flex items-end gap-6 text-foreground">
      {[12, 14, 16, 20, 24].map((size) => (
        <figure key={size} className="flex flex-col items-center gap-2">
          <CheckGlyph size={size} />
          <figcaption className="font-mono text-[10px] text-muted-foreground">{size}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  name: "Inherits colour",
  parameters: {
    docs: {
      description: {
        story:
          "No colour of its own. Each row sets `color` on the wrapper and the glyph follows, so a " +
          "checkbox in a destructive or disabled state needs no glyph variant.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-3">
      {[
        ["text-primary", "on a checked control"],
        ["text-destructive", "invalid"],
        ["text-muted-foreground", "disabled"],
      ].map(([cls, label]) => (
        <div key={cls} className={`flex items-center gap-3 ${cls}`}>
          <CheckGlyph />
          <IndeterminateGlyph />
          <span className="text-xs">{label}</span>
        </div>
      ))}
    </div>
  ),
};

export const InAControl: Story = {
  name: "Inside a checkbox",
  parameters: {
    docs: {
      description: {
        story: "What it is for: a real tri-state control, cycling unchecked → checked → mixed.",
      },
    },
  },
  render: () => {
    const [state, setState] = useState<"off" | "on" | "mixed">("off");
    const next = { off: "on", on: "mixed", mixed: "off" } as const;
    return (
      <button
        type="button"
        // aria-pressed rather than role="checkbox": this is a toggle BUTTON
        // demonstrating the glyph, not a form control. aria-pressed carries the
        // same tri-state ("mixed"), and claiming the checkbox role on a <button>
        // would promise a form value it does not have.
        aria-pressed={state === "mixed" ? "mixed" : state === "on"}
        aria-label="Toggle selection"
        onClick={() => setState(next[state])}
        className="grid size-5 place-items-center rounded-[var(--radius-sm)] bg-neutral-3 text-primary transition-colors data-[on=true]:bg-primary data-[on=true]:text-primary-foreground"
        data-on={state !== "off"}
      >
        {state === "on" && <CheckGlyph size={14} />}
        {state === "mixed" && <IndeterminateGlyph size={14} />}
      </button>
    );
  },
};
