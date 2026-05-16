import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Radio, RadioGroup, useRadio } from "./radio-group";

const meta = {
  title: "Primitives/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Native-radio-backed single-choice primitive. Renders fieldset/legend for grouped options and keeps the legacy RadioGroupItem export for compatibility.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function HeadlessRadioRow({ label, value }: { label: string; value: string }) {
  const radio = useRadio({ value, "aria-label": label });

  return (
    <label
      htmlFor={radio.inputProps.id}
      className="flex min-w-64 cursor-pointer items-center justify-between rounded-[var(--radius-lg)] border border-border px-3 py-2 text-sm"
    >
      <span>{label}</span>
      {radio.component}
    </label>
  );
}

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="iad1" label="Deployment Region">
      <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
      <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
      <RadioGroup.Item value="fra1">Frankfurt</RadioGroup.Item>
    </RadioGroup>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState("monthly");

    return (
      <RadioGroup label="Billing Cycle" onChange={setValue} value={value}>
        <RadioGroup.Item value="monthly" description="Pay at the start of each month.">
          Monthly
        </RadioGroup.Item>
        <RadioGroup.Item value="yearly" description="Save 20 percent with one annual invoice.">
          Yearly
        </RadioGroup.Item>
      </RadioGroup>
    );
  },
};

export const RequiredEmpty: Story = {
  render: () => (
    <form className="flex flex-col items-start gap-4">
      <RadioGroup label="Deletion Window" name="deletion-window" required>
        <RadioGroup.Item value="24h">24 Hours</RadioGroup.Item>
        <RadioGroup.Item value="7d">7 Days</RadioGroup.Item>
      </RadioGroup>
      <button
        type="submit"
        className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm"
      >
        Submit
      </button>
    </form>
  ),
};

export const DisabledOptionWithReason: Story = {
  render: () => (
    <RadioGroup defaultValue="hobby" label="Plan Tier">
      <RadioGroup.Item value="hobby">Hobby</RadioGroup.Item>
      <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
      <RadioGroup.Item
        value="enterprise"
        disabled
        disabledReason="Available after team verification."
      >
        Enterprise
      </RadioGroup.Item>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="preview" label="Environment" orientation="horizontal">
      <RadioGroup.Item value="preview">Preview</RadioGroup.Item>
      <RadioGroup.Item value="production">Production</RadioGroup.Item>
    </RadioGroup>
  ),
};

export const Headless: Story = {
  render: () => (
    <RadioGroup defaultValue="compact" label="Density">
      <HeadlessRadioRow label="Compact" value="compact" />
      <HeadlessRadioRow label="Comfortable" value="comfortable" />
    </RadioGroup>
  ),
};

export const Standalone: Story = {
  render: () => {
    const [value, setValue] = useState("one");

    return (
      <div className="flex items-center gap-2 text-sm">
        <span id="standalone-radio-one">Option 1</span>
        <Radio
          aria-labelledby="standalone-radio-one"
          checked={value === "one"}
          name="standalone-radio"
          onChange={() => setValue("one")}
          value="one"
        />
      </div>
    );
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-xl)] bg-background p-8">
      <RadioGroup defaultValue="weekly" label="Report Cadence">
        <RadioGroup.Item value="daily">Daily</RadioGroup.Item>
        <RadioGroup.Item value="weekly">Weekly</RadioGroup.Item>
        <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
      </RadioGroup>
    </div>
  ),
};
