import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage, Error as ErrorSurface } from "./error-message";
import { Input } from "./input";

const meta = {
  title: "Primitives/Error",
  component: ErrorSurface,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Block-level error surface for failed resources. Use ErrorMessage only for legacy inline validation text.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "radio" },
      options: ["small", "medium", "large"],
    },
    live: {
      control: { type: "radio" },
      options: ["polite", "assertive", "off"],
    },
  },
} satisfies Meta<typeof ErrorSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Couldn’t Load Deployments",
    children: "The deployments list failed to load. Try again or check the request details.",
    errorId: "iad1::r7h2p-1712f9cda5d8",
  },
};

export const CustomLabel: Story = {
  args: {
    label: "Request Error",
    title: "Couldn’t Load Billing Usage",
    children: "The usage summary failed before fresh data could be rendered.",
    errorId: "req_2d9YQfMJ9x5p",
  },
};

export const NoLabel: Story = {
  args: {
    showLabel: false,
    title: "Couldn’t Verify Passkey",
    children: "Try again from this device or use another sign-in method.",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="grid w-[min(42rem,calc(100vw-2rem))] gap-4">
      <ErrorSurface size="small" title="Couldn’t Save Settings">
        Your session expired. Sign in again and retry the save.
      </ErrorSurface>
      <ErrorSurface size="medium" title="Couldn’t Load Deployments">
        The deployments list failed to load. Try again.
      </ErrorSurface>
      <ErrorSurface size="large" title="Build Failed" errorId="dpl_8f3a0e2c1b">
        Bundle exceeds 50 MB. Reduce the serverless function size and redeploy.
      </ErrorSurface>
    </div>
  ),
};

export const WithErrorProp: Story = {
  render: () => (
    <ErrorSurface
      error={{
        title: "Request Failed",
        message: "The support request could not be created.",
        action: "Contact Support",
        link: "https://vercel.com/contact",
        id: "req_01HR8M2E8K9Z2P",
      }}
    />
  ),
};

export const RetryAction: Story = {
  render: () => (
    <ErrorSurface
      title="Couldn’t Load Projects"
      action="Try Again"
      onAction={() => undefined}
      errorId="sfo1::9b7d2-448caa1b"
    >
      The projects endpoint timed out before returning data.
    </ErrorSurface>
  ),
};

export const InlineLegacy: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="email">
        Email
      </label>
      <Input id="email" type="email" defaultValue="taken@example.com" />
      <ErrorMessage>This email address is already in use.</ErrorMessage>
    </div>
  ),
};
