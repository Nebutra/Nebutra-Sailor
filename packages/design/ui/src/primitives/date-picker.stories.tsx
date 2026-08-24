import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { DatePicker } from "./date-picker";

const meta = {
  title: "Primitives/DatePicker",
  component: DatePicker,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'Date field with a themed calendar popover. Drop-in for `<input type="date">` — the value stays `yyyy-MM-dd` — but the picker is ours, so it follows the theme instead of the OS. Typing is preserved for far-off dates.',
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Start date", id: "date-picker-default" },
  render: (args) => {
    const [value, setValue] = React.useState("2026-08-24");
    return (
      <div className="w-72">
        <DatePicker {...args} value={value} onValueChange={setValue} />
        <p className="mt-3 text-xs text-muted-foreground">
          Value: <code>{value || "(empty)"}</code>
        </p>
      </div>
    );
  },
};

export const Sizes: Story = {
  args: { label: "Date", id: "date-picker-sizes" },
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <DatePicker id="dp-sm" size="sm" label="Small" defaultValue="2026-08-24" />
      <DatePicker id="dp-md" size="md" label="Medium" defaultValue="2026-08-24" />
      <DatePicker id="dp-lg" size="lg" label="Large" defaultValue="2026-08-24" />
    </div>
  ),
};

export const Bounded: Story = {
  args: { label: "Delivery date", id: "date-picker-bounded" },
  render: (args) => (
    <div className="w-72">
      <DatePicker
        {...args}
        min="2026-08-10"
        max="2026-09-15"
        defaultValue="2026-08-24"
        description="Only dates between Aug 10 and Sep 15 can be selected."
      />
    </div>
  ),
};

export const Invalid: Story = {
  args: { label: "Birth date", id: "date-picker-invalid" },
  render: (args) => (
    <div className="w-72">
      <DatePicker {...args} defaultValue="" error="Pick a date to continue." />
    </div>
  ),
};

export const Disabled: Story = {
  args: { label: "Locked date", id: "date-picker-disabled" },
  render: (args) => (
    <div className="w-72">
      <DatePicker {...args} defaultValue="2026-08-24" disabled />
    </div>
  ),
};
