import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ColorPicker, ColorPickerPopover } from "./color-picker";

const ACCENTS = ["#3b82c4", "#14b8a6", "#a855f7", "#f97316", "#e11d48", "#334155"] as const;

const meta = {
  title: "Primitives/ColorPicker",
  component: ColorPicker,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Saturation/brightness area, hue and opacity sliders, HEX / RGB / OKLCH field, EyeDropper where the browser has one, and an optional preset row. Emits hex plus an OKLCH string. Replaces the native colour dialog.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [color, setColor] = useState("#2e65ee");
    return (
      <div className="flex flex-col items-start gap-3">
        <ColorPicker value={color} onChange={setColor} />
        <p className="font-mono text-xs text-muted-foreground">{color}</p>
      </div>
    );
  },
};

export const WithSwatches: Story = {
  render: () => {
    const [color, setColor] = useState<string>(ACCENTS[0]);
    return <ColorPicker swatches={ACCENTS} value={color} onChange={setColor} />;
  },
};

export const WithAlpha: Story = {
  render: () => {
    const [color, setColor] = useState("#0bf1c3cc");
    return (
      <div className="flex flex-col items-start gap-3">
        <ColorPicker alpha value={color} onChange={setColor} />
        <p className="font-mono text-xs text-muted-foreground">{color}</p>
      </div>
    );
  },
};

export const Popover: Story = {
  render: () => {
    const [color, setColor] = useState("#8b5cf6");
    return (
      <div className="flex items-center gap-3">
        <ColorPickerPopover swatches={ACCENTS} value={color} onChange={setColor} />
        <span className="font-mono text-sm">{color}</span>
      </div>
    );
  },
};

export const Dark: Story = {
  parameters: { backgrounds: { default: "dark" } },
  render: () => {
    const [color, setColor] = useState("#8b5cf6");
    return (
      <div className="dark rounded-xl bg-background p-6 text-foreground">
        <ColorPicker alpha swatches={ACCENTS} value={color} onChange={setColor} />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => <ColorPicker disabled swatches={ACCENTS} defaultValue="#2e65ee" />,
};
