import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Spinner } from "./spinner";

const meta = {
  title: "Primitives/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Canonical indeterminate loader for short, single-action waits. Prefer Button loading state when the spinner belongs inside a button.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
    tone: {
      control: "select",
      options: ["default", "foreground", "inverse"],
    },
    variant: {
      table: {
        disable: true,
      },
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Spinner />,
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          <Spinner size={size} />
          <span className="text-muted-foreground text-sm">{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const NumericSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      {[12, 32, 40].map((size) => (
        <div key={size} className="flex items-center gap-2">
          <Spinner size={size} />
          <span className="text-muted-foreground text-sm">{size}px</span>
        </div>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Spinner tone="default" />
        <span className="text-muted-foreground text-sm">Default muted feedback</span>
      </div>
      <div className="flex items-center gap-3">
        <Spinner tone="foreground" />
        <span className="text-sm">Foreground emphasis</span>
      </div>
      <div className="flex items-center gap-3 rounded-md bg-primary px-3 py-2 text-primary-foreground">
        <Spinner tone="inverse" />
        <span className="text-sm">Inverse on primary surface</span>
      </div>
    </div>
  ),
};

export const WithStatusLabel: Story = {
  render: () => (
    <div className="flex items-center gap-3" aria-busy="true">
      <Spinner label="Verifying deployment" />
      <span className="text-muted-foreground text-sm">Verifying deployment...</span>
    </div>
  ),
};

export const ButtonLoading: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button loading>Saving changes</Button>
      <Button loading variant="secondary">
        Retrying row
      </Button>
    </div>
  ),
};

export const LegacyVariantCompatibility: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(["default", "ring", "infinite"] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          <Spinner variant={variant} />
          <span className="text-muted-foreground text-sm">{variant}</span>
        </div>
      ))}
    </div>
  ),
};
