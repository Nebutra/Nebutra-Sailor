import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "./error-message";

const meta = {
  title: "Primitives/ErrorMessage",
  component: ErrorMessage,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Good error design is clear, useful, and friendly. Designing concise and accurate error messages " +
          "unblocks users and builds trust by meeting people where they are.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "radio" },
      options: ["small", "medium", "large"],
    },
  },
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Default
// =============================================================================

export const Default: Story = {
  args: {
    children: "This email address is already in use.",
  },
};

// =============================================================================
// CustomLabel
// =============================================================================

export const CustomLabel: Story = {
  args: {
    label: "Email Error",
    children: "This email address is already in use.",
  },
};

// =============================================================================
// Sizes
// =============================================================================

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <ErrorMessage size="small">This email is in use.</ErrorMessage>
      <ErrorMessage size="medium">This email is in use.</ErrorMessage>
      <ErrorMessage size="large">This email is in use.</ErrorMessage>
    </div>
  ),
};

// =============================================================================
// WithErrorProp — structured error with action link
// =============================================================================

export const WithErrorProp: Story = {
  render: () => (
    <ErrorMessage
      error={{
        message: "The request failed.",
        action: "Contact Us",
        link: "https://vercel.com/contact",
      }}
    />
  ),
};

// =============================================================================
// InForm — realistic usage below a form field
// =============================================================================

export const InForm: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        defaultValue="taken@example.com"
        className="rounded-md border border-destructive bg-background px-3 py-2 text-sm text-foreground outline-none ring-destructive focus:ring-1"
      />
      <ErrorMessage>This email address is already in use.</ErrorMessage>
    </div>
  ),
};
