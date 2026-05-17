import { LockClosedSmall, LockOpenSmall } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Toggle } from "./toggle";

const meta: Meta<typeof Toggle> = {
  title: "Primitives/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Controlled boolean setting switch for immediate on/off preferences. Use Switch for segmented view selection.",
      },
    },
  },
  argTypes: {
    size: {
      control: "radio",
      options: ["small", "normal", "large"],
    },
    color: {
      control: "radio",
      options: ["default", "blue", "cyan", "success", "warning", "error", "neutral"],
    },
    disabled: { control: "boolean" },
    direction: {
      control: "radio",
      options: ["label-first", "switch-first"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

function ControlledToggle({
  initial = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Toggle>, "checked" | "onChange"> & {
  initial?: boolean;
}) {
  const [checked, setChecked] = React.useState(initial);

  return (
    <Toggle {...props} checked={checked} onChange={setChecked}>
      {children}
    </Toggle>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <ControlledToggle aria-label="Enable firewall" />
      <ControlledToggle aria-label="Enable firewall" initial />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Toggle aria-label="Enable firewall" checked={false} disabled />
      <Toggle aria-label="Enable firewall" checked disabled />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <ControlledToggle aria-label="Small toggle" size="small" />
      <ControlledToggle aria-label="Normal toggle" size="normal" />
      <ControlledToggle aria-label="Large toggle" size="large" />
    </div>
  ),
};

export const SemanticColors: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      {(["default", "blue", "cyan", "success", "warning", "error", "neutral"] as const).map(
        (color) => (
          <ControlledToggle aria-label={`${color} toggle`} color={color} initial key={color} />
        ),
      )}
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <ControlledToggle
        aria-label="Enable firewall"
        color="warning"
        icon={{
          checked: <LockClosedSmall />,
          unchecked: <LockOpenSmall />,
        }}
      />
      <ControlledToggle
        aria-label="Enable firewall"
        color="error"
        icon={{
          checked: <LockClosedSmall />,
          unchecked: <LockOpenSmall />,
        }}
        size="large"
      />
    </div>
  ),
};

export const WithLabels: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <ControlledToggle>Firewall</ControlledToggle>
      <ControlledToggle direction="switch-first">Password Protection</ControlledToggle>
      <div className="grid gap-1">
        <ControlledToggle>Auto-Cancel Builds</ControlledToggle>
        <p className="text-muted-foreground text-xs">
          ON cancels queued builds when a newer commit arrives.
        </p>
      </div>
    </div>
  ),
};
