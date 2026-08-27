import { CheckCircle, Information, Warning, WarningFill } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
} from "./alert";
import { Button } from "./button";

const meta = {
  title: "Primitives/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Contextual feedback banner. Two axes compose independently: `variant` (secondary/primary/destructive/success/info/warning/mono) is the semantic meaning, `appearance` (solid/outline/light/stroke) is how loud it reads on the page — `light` is the usual pick for an inline banner, `solid` for something that must not be missed (e.g. a toast). `size` is sm/md/lg. Compose `AlertIcon` + `AlertTitle` for a one-liner, or wrap `AlertTitle` + `AlertDescription` in `AlertContent` when there's supporting copy.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["secondary", "primary", "destructive", "success", "info", "mono", "warning"],
    },
    appearance: {
      control: "select",
      options: ["solid", "outline", "light", "stroke"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert variant="primary" appearance="light">
      <AlertIcon>
        <Information className="size-5" aria-hidden="true" />
      </AlertIcon>
      <AlertTitle>New version available</AlertTitle>
    </Alert>
  ),
};

/**
 * `AlertContent` groups `AlertTitle` + `AlertDescription` so both are
 * vertically stacked and the description inherits the muted body copy size.
 */
export const WithDescription: Story = {
  render: () => (
    <Alert variant="destructive" appearance="outline">
      <AlertIcon>
        <WarningFill className="size-5" aria-hidden="true" />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>Deploy failed</AlertTitle>
        <AlertDescription>Build exited with code 1. Check the logs for details.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
};

/** All seven `variant` values at the `light` appearance — the default pick for an inline banner. */
export const AllVariants: Story = {
  name: "All Variants (light)",
  render: () => (
    <div className="flex flex-col gap-2">
      <Alert variant="secondary" appearance="light">
        <AlertTitle>Secondary — neutral, informational default</AlertTitle>
      </Alert>
      <Alert variant="primary" appearance="light">
        <AlertTitle>Primary — brand-aligned callout</AlertTitle>
      </Alert>
      <Alert variant="success" appearance="light">
        <AlertTitle>Success — action completed</AlertTitle>
      </Alert>
      <Alert variant="info" appearance="light">
        <AlertTitle>Info — supplementary context</AlertTitle>
      </Alert>
      <Alert variant="warning" appearance="light">
        <AlertTitle>Warning — needs attention, not yet broken</AlertTitle>
      </Alert>
      <Alert variant="destructive" appearance="light">
        <AlertTitle>Destructive — something failed</AlertTitle>
      </Alert>
      <Alert variant="mono" appearance="light">
        <AlertTitle>Mono — muted, low-emphasis system note</AlertTitle>
      </Alert>
    </div>
  ),
};

/**
 * `appearance` controls loudness independent of `variant`: `solid` for a
 * banner that must not be missed, `outline` for a bordered inline note,
 * `light` for the quiet default, `stroke` for text-only with no fill.
 */
export const Appearances: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Alert variant="primary" appearance="solid">
        <AlertTitle>Solid — highest emphasis</AlertTitle>
      </Alert>
      <Alert variant="primary" appearance="outline">
        <AlertTitle>Outline — bordered, background matches page</AlertTitle>
      </Alert>
      <Alert variant="primary" appearance="light">
        <AlertTitle>Light — tonal fill, the usual default</AlertTitle>
      </Alert>
      <Alert variant="primary" appearance="stroke">
        <AlertTitle>Stroke — text only, no fill or border</AlertTitle>
      </Alert>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Alert variant="secondary" appearance="light" size="sm">
        <AlertTitle>Small — dense lists, table row banners</AlertTitle>
      </Alert>
      <Alert variant="secondary" appearance="light" size="md">
        <AlertTitle>Medium — the default</AlertTitle>
      </Alert>
      <Alert variant="secondary" appearance="light" size="lg">
        <AlertTitle>Large — page-level announcements</AlertTitle>
      </Alert>
    </div>
  ),
};

/** `close` renders a dismiss button; `AlertToolbar` holds an inline action. */
function DismissibleDemo() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return <p className="text-sm text-muted-foreground">Dismissed — re-run the story to reset.</p>;
  }
  return (
    <Alert variant="warning" appearance="light" close onClose={() => setDismissed(true)}>
      <AlertIcon>
        <Warning className="size-5" aria-hidden="true" />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>Your plan expires in 3 days</AlertTitle>
        <AlertDescription>Renew now to avoid an interruption in service.</AlertDescription>
      </AlertContent>
    </Alert>
  );
}

export const Dismissible: Story = {
  render: () => <DismissibleDemo />,
};

export const WithToolbarAction: Story = {
  render: () => (
    <Alert variant="success" appearance="light" size="lg">
      <AlertIcon>
        <CheckCircle className="size-6" aria-hidden="true" />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>Payment method updated</AlertTitle>
        <AlertDescription>Your card ending in 4242 is now the default.</AlertDescription>
      </AlertContent>
      <AlertToolbar>
        <Button size="sm" variant="ghost">
          Undo
        </Button>
      </AlertToolbar>
    </Alert>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark flex flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-4">
      <Alert variant="primary" appearance="light">
        <AlertTitle>Light appearance keeps working in dark mode</AlertTitle>
      </Alert>
      <Alert variant="destructive" appearance="solid">
        <AlertTitle>Solid destructive stays legible</AlertTitle>
      </Alert>
    </div>
  ),
};
