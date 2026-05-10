import type { Meta, StoryObj } from "@storybook/react";
import { Feedback } from "./feedback";

const meta = {
  title: "Primitives/Feedback",
  component: Feedback,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Gather text feedback with an associated emotion.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "radio" },
      options: ["default", "inline"],
    },
  },
} satisfies Meta<typeof Feedback>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Default — trigger button + popover panel
// =============================================================================

export const Default: Story = {
  args: {
    label: "vercel",
    dryRun: true,
  },
};

// =============================================================================
// Inline — "Was this helpful?" bar
// =============================================================================

export const Inline: Story = {
  args: {
    label: "vercel",
    type: "inline",
    dryRun: true,
  },
};

// =============================================================================
// WithSelect — topic dropdown pre-configured
// =============================================================================

export const WithSelect: Story = {
  args: {
    label: "vercel",
    dryRun: true,
    topics: ["Bug report", "Feature request", "Performance", "Documentation", "Other"],
  },
};

// =============================================================================
// WithMetadata — arbitrary metadata attached to submission
// =============================================================================

export const WithMetadata: Story = {
  args: {
    label: "vercel",
    dryRun: true,
    metadata: {
      userId: "user_12345",
      location: "post-checkout",
      orderId: "order_123456",
    },
  },
};

// =============================================================================
// WithSubmitHandler — logs payload to console
// =============================================================================

export const WithSubmitHandler: Story = {
  args: {
    label: "my-app",
    onSubmit: (_payload) => {},
  },
};
