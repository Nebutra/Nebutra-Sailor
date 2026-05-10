import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, CheckboxGroup } from "./checkbox-group";

const meta = {
  title: "Primitives/CheckboxGroup",
  component: CheckboxGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A layout wrapper for grouping multiple Checkbox items with accessible labeling and orientation control.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <CheckboxGroup label="Select features">
      <Checkbox>Analytics</Checkbox>
      <Checkbox>Notifications</Checkbox>
      <Checkbox>Integrations</Checkbox>
      <Checkbox>API Access</Checkbox>
    </CheckboxGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <CheckboxGroup label="Select options" orientation="horizontal">
      <Checkbox>Option A</Checkbox>
      <Checkbox>Option B</Checkbox>
      <Checkbox>Option C</Checkbox>
    </CheckboxGroup>
  ),
};

export const WithDisabled: Story = {
  render: () => (
    <CheckboxGroup label="Plan features">
      <Checkbox checked>100GB Storage</Checkbox>
      <Checkbox>Unlimited users</Checkbox>
      <Checkbox disabled>SSO (Enterprise only)</Checkbox>
      <Checkbox disabled>SLA guarantee (Enterprise only)</Checkbox>
    </CheckboxGroup>
  ),
};
