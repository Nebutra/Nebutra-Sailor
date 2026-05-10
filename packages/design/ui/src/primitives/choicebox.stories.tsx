import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ChoiceboxGroup } from "./choicebox";

const meta = {
  title: "Primitives/Choicebox",
  component: ChoiceboxGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A card-style selection control supporting single (radio) and multi (checkbox) selection modes. Larger tap target with title, description, and optional custom content.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChoiceboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const RadioDefault: Story = {
  name: "Radio (Single Select)",
  render: () => {
    const [value, setValue] = useState("trial");
    return (
      <ChoiceboxGroup
        direction="row"
        label="Select a plan"
        type="radio"
        value={value}
        onChange={(v) => setValue(v as string)}
      >
        <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial" />
        <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
      </ChoiceboxGroup>
    );
  },
};

export const CheckboxDefault: Story = {
  name: "Checkbox (Multi Select)",
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <ChoiceboxGroup
        direction="row"
        label="Select plans"
        type="checkbox"
        value={value}
        onChange={(v) => setValue(v as string[])}
      >
        <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial" />
        <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
      </ChoiceboxGroup>
    );
  },
};

export const ColumnLayout: Story = {
  name: "Column Layout",
  render: () => {
    const [value, setValue] = useState("starter");
    return (
      <ChoiceboxGroup
        direction="column"
        label="Choose a tier"
        type="radio"
        value={value}
        onChange={(v) => setValue(v as string)}
        className="w-[300px]"
      >
        <ChoiceboxGroup.Item title="Starter" description="For personal projects" value="starter" />
        <ChoiceboxGroup.Item title="Team" description="For small teams up to 10" value="team" />
        <ChoiceboxGroup.Item
          title="Enterprise"
          description="Custom solutions for large orgs"
          value="enterprise"
        />
      </ChoiceboxGroup>
    );
  },
};

export const WithCustomContent: Story = {
  name: "With Custom Content",
  render: () => {
    const [value, setValue] = useState("trial");
    return (
      <ChoiceboxGroup
        direction="row"
        label="Select a plan"
        type="radio"
        value={value}
        onChange={(v) => setValue(v as string)}
      >
        <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial">
          <div className="flex justify-center p-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Trial
            </span>
          </div>
        </ChoiceboxGroup.Item>
        <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro">
          <div className="flex justify-center p-2">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Pro
            </span>
          </div>
        </ChoiceboxGroup.Item>
      </ChoiceboxGroup>
    );
  },
};

export const DisabledGroup: Story = {
  name: "Disabled Group",
  render: () => (
    <ChoiceboxGroup
      direction="row"
      label="Choicebox group disabled"
      showLabel
      type="radio"
      disabled
    >
      <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial" />
      <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
    </ChoiceboxGroup>
  ),
};

export const DisabledItem: Story = {
  name: "Disabled Item",
  render: () => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <ChoiceboxGroup
        direction="row"
        label="Single input disabled"
        showLabel
        type="checkbox"
        value={value}
        onChange={(v) => setValue(v as string[])}
      >
        <ChoiceboxGroup.Item
          title="Pro Trial"
          description="Free for two weeks"
          value="trial"
          disabled
        />
        <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
      </ChoiceboxGroup>
    );
  },
};

export const WithLabel: Story = {
  name: "With Visible Label",
  render: () => {
    const [value, setValue] = useState("trial");
    return (
      <ChoiceboxGroup
        direction="row"
        label="Select a plan"
        showLabel
        type="radio"
        value={value}
        onChange={(v) => setValue(v as string)}
      >
        <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial" />
        <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
      </ChoiceboxGroup>
    );
  },
};
