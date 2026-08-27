import { CreditCard, FileText, Layers } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "../layout/EmptyState";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Primitives/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'Bordered surface with a tonal fill (`bg-card` / `text-card-foreground`, not a raw `bg-white`), used to group related content. `Card` is the container only — `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` and `CardFooter` are optional sub-parts you compose as needed. This is the primitive behind ~40 hand-rolled `<div className="rounded-lg border …">` call sites across apps/web before this story existed.',
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-foreground">
          A bare card is just the border + tonal fill — reach for it when the content doesn't need a
          header or footer.
        </p>
      </CardContent>
    </Card>
  ),
};

export const FullComposition: Story = {
  name: "Header, Content & Footer",
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Production deploy</CardTitle>
        <CardDescription>Triggered by push to main, 3 minutes ago.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="size-4" aria-hidden="true" />
          <span>12 routes built, 0 warnings</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline">
          View logs
        </Button>
        <Button size="sm">Promote to production</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Only `Card` + `CardContent` — the header and footer are optional, not
 * required scaffolding. Most list-row and stat-tile cards in apps/web only
 * need this pair.
 */
export const ContentOnly: Story = {
  render: () => (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <CreditCard className="size-5 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">Visa •••• 4242</p>
          <p className="text-xs text-muted-foreground">Expires 04/2028</p>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Loading: Story = {
  name: "Loading (skeleton)",
  render: () => (
    <Card>
      <CardHeader>
        <Skeleton height={20} width="60%" />
        <Skeleton height={14} width="80%" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton height={14} />
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="70%" />
      </CardContent>
    </Card>
  ),
};

export const Empty: Story = {
  render: () => (
    <Card>
      <CardContent className="pt-6">
        <EmptyState
          size="sm"
          icon={<FileText className="size-5" aria-hidden="true" />}
          title="No documents yet"
          description="Upload a file to see it listed here."
        />
      </CardContent>
    </Card>
  ),
};

/**
 * Long, unbroken content (a token, a stack trace, a URL) must scroll inside
 * the card, not push the card's own width or stack the layout.
 */
export const Overflow: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Deploy hook URL</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-muted p-3 text-xs text-muted-foreground">
          https://api.nebutra.com/v1/hooks/deploy?token=whsec_9f2a1c4e7b8d3f6091a2c5e8b1d4f7902361c4e8b7a3d6f9012c5e8b1d4f790
        </pre>
      </CardContent>
    </Card>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6">
      <Card>
        <CardHeader>
          <CardTitle>Production deploy</CardTitle>
          <CardDescription>Triggered by push to main, 3 minutes ago.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            `bg-card` and `border-border` both carry real dark values — no per-component dark
            override is needed.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};
