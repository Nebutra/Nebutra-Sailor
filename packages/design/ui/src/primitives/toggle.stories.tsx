import type { Meta, StoryObj } from "@storybook/react";
import { Lock, LockOpen } from "lucide-react";
import { Toggle } from "./toggle";

const meta: Meta<typeof Toggle> = {
  title: "Primitives/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "radio",
      options: ["normal", "large"],
    },
    color: {
      control: "radio",
      options: ["default", "amber", "red", "green"],
    },
    disabled: { control: "boolean" },
    direction: {
      control: "radio",
      options: ["switch-first", "switch-last"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
  args: {},
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex gap-4">
      <Toggle {...args} size="normal" />
      <Toggle {...args} size="large" />
    </div>
  ),
};

export const CustomColors: Story = {
  render: (args) => (
    <div className="flex gap-4">
      <Toggle {...args} color="default" defaultChecked />
      <Toggle {...args} color="amber" defaultChecked />
      <Toggle {...args} color="red" defaultChecked />
      <Toggle {...args} color="green" defaultChecked />
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <Toggle
        {...args}
        size="large"
        icon={{
          checked: <Lock className="h-4 w-4" />,
          unchecked: <LockOpen className="h-4 w-4" />,
        }}
      />
      <Toggle
        {...args}
        color="red"
        icon={{
          checked: <Lock className="h-3 w-3" />,
          unchecked: <LockOpen className="h-3 w-3" />,
        }}
      />
    </div>
  ),
};

export const WithLabels: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Toggle {...args}>Enable Firewall</Toggle>
      <Toggle {...args} direction="switch-first">
        Enable Firewall
      </Toggle>
    </div>
  ),
};
