import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Input } from "./input";
import { Slider } from "./slider";

const meta = {
  title: "Primitives/Slider",
  component: Slider,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Single-value ranged input for approximate numeric settings. Pair with Input when exact values matter.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState([50]);

    return (
      <div className="w-80">
        <Slider
          label="Sample Rate"
          max={96}
          min={8}
          onValueChange={setValue}
          step={4}
          unit=" kHz"
          value={value}
        />
      </div>
    );
  },
};

export const NumberCompatibility: Story = {
  render: () => {
    const [value, setValue] = useState(70);

    return (
      <div className="w-80">
        <Slider label="Volume" max={100} onValueChange={setValue} step={5} unit="%" value={value} />
      </div>
    );
  },
};

export const PairedWithInput: Story = {
  render: () => {
    const [value, setValue] = useState(64);

    return (
      <div className="grid w-96 gap-3">
        <Slider
          label="Memory Limit"
          max={128}
          min={16}
          onValueChange={setValue}
          step={4}
          unit=" GB"
          value={value}
        />
        <div className="flex items-center gap-2">
          <Input
            aria-label="Memory Limit in GB"
            className="max-w-24"
            max={128}
            min={16}
            onChange={(event) => setValue(Number(event.currentTarget.value))}
            step={4}
            type="number"
            value={value}
          />
          <span className="text-muted-foreground text-sm">GB</span>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-80">
      <Slider defaultValue={40} disabled label="Disabled Limit" unit="%" />
    </div>
  ),
};

export const LongLabel: Story = {
  render: () => (
    <div className="w-80">
      <Slider
        defaultValue={80}
        label="Maximum concurrent build bandwidth allocation"
        max={100}
        step={10}
        unit="%"
      />
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark w-80">
      <Slider defaultValue={50} label="Sample Rate" max={96} min={8} step={4} unit=" kHz" />
    </div>
  ),
};
