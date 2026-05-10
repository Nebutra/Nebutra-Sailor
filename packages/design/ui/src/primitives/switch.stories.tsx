import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "./switch";

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Binary toggle built on HeroUI switch with controlled/uncontrolled support.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex h-12 w-32 items-center gap-3">
      <Switch name="notifications">
        <Switch.Control value="on" label="Enable notifications" defaultChecked />
        <Switch.Control value="off" label="Off" />
      </Switch>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    return (
      <div className="flex h-12 w-32 items-center gap-3">
        <Switch name="usage-alerts">
          <Switch.Control value="on" label="On" defaultChecked />
          <Switch.Control value="off" label="Off" />
        </Switch>
      </div>
    );
  },
};
