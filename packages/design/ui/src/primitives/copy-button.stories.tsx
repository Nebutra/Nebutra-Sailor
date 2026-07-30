import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  CopyableField,
  CopyButton,
  CopyCodeButton,
  CopyIdButton,
  CopyLinkButton,
  CopyMenuItem,
} from "./copy-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";

/**
 * The library CopyButton had zero importers while seven files hand-rolled their
 * own — the census called that a seven-way duplication, not dead code. These
 * stories are the reference the adopters were missing, so each one is named
 * after the call-site shape it replaces.
 */
const meta: Meta<typeof CopyButton> = {
  title: "Primitives/CopyButton",
  component: CopyButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "Copy-to-clipboard with four layers of confirmation: the icon swaps to a check tinted",
          "`--success-strong`, a visible `label` swaps to `copiedLabel`, `successMessage` lands in a",
          "polite live region for screen readers, and optionally a toast. All four reset together",
          "after `timeout`.",
        ].join(" "),
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

/** Icon-only. The tooltip text doubles as the accessible name. */
export const Default: Story = {
  args: { value: "npm i @nebutra/ui" },
};

/** With a visible label, which swaps to `copiedLabel` while the state is held. */
export const WithLabel: Story = {
  args: { value: "NEB-1029-XY", label: "Copy", variant: "outline", size: "sm" },
};

/**
 * Icon-only variants for the four `iconType` values, plus the three presets.
 * Click each and watch the check land — the confirmation is the contract here.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CopyButton value="copy" iconType="copy" tooltipText="Copy" />
        <CopyButton value="https://nebutra.com" iconType="link" tooltipText="Copy link" />
        <CopyButton value="const a = 1;" iconType="code" tooltipText="Copy code" />
        <CopyButton value="org_123" iconType="hash" tooltipText="Copy ID" />
      </div>
      <div className="flex items-center gap-2">
        <CopyIdButton id="org_2n8Xq" />
        <CopyLinkButton url="https://nebutra.com/pricing" />
        <CopyCodeButton code="pnpm add @nebutra/ui" />
      </div>
    </div>
  ),
};

/**
 * `apps/web` shape — tiny bordered chip, silent (no toast), 1.6s hold, and its
 * own `aria-label` naming *what* is copied while the visible text stays "Copy".
 */
export const CompactChip: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <CopyButton
        value="NEB-1029-XY"
        aria-label="Copy referral code"
        label="Copy"
        variant="outline"
        size="tiny"
        showToast={false}
        timeout={1600}
        className="h-auto gap-1.5 rounded-[var(--radius-md)] border-neutral-7 bg-neutral-1 px-2.5 py-1 text-xs text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:bg-black/40"
      />
      <CopyButton
        value="https://nebutra.com/r/NEB-1029-XY"
        aria-label="Copy share link"
        label="Copy"
        variant="outline"
        size="tiny"
        showToast={false}
        timeout={1600}
        className="h-auto gap-1.5 rounded-[var(--radius-md)] border-neutral-7 bg-neutral-1 px-2.5 py-1 text-xs text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:bg-black/40"
      />
    </div>
  ),
};

/**
 * `packages/design/docs-shared` shape — full-width mono row where the label *is*
 * the payload, so the icon moves to the trailing edge and `copiedLabel={false}`
 * keeps the value on screen. Long values truncate rather than widen the row.
 */
export const TokenRow: Story = {
  render: () => (
    <div className="w-80 overflow-hidden rounded-lg border border-border bg-card">
      <CopyButton
        value="var(--gradient-brand)"
        label="var(--gradient-brand)"
        variant="ghost"
        size="tiny"
        iconPosition="trailing"
        copiedLabel={false}
        showToast={false}
        tooltipText="Copy CSS value"
        className="h-auto w-full justify-between gap-2 rounded-md px-3 py-2 font-mono text-xs font-normal text-muted-foreground"
      />
      <div className="h-px w-full bg-border" />
      <CopyButton
        value="linear-gradient(135deg, hsl(var(--primary)) 0%, #0BF1C3 100%)"
        label="linear-gradient(135deg, hsl(var(--primary)) 0%, #0BF1C3 100%)"
        variant="ghost"
        size="tiny"
        iconPosition="trailing"
        copiedLabel={false}
        showToast={false}
        tooltipText="Copy CSS value"
        className="h-auto w-full justify-between gap-2 rounded-md px-3 py-2 font-mono text-xs font-normal text-muted-foreground"
      />
    </div>
  ),
};

/**
 * `CopyMenuItem` is a separate component, not a CopyButton variant: a `<button>`
 * inside `DropdownMenuContent` is invisible to the menu's keyboard machinery, so
 * this composes over `DropdownMenuItem` instead and keeps arrow-key highlight,
 * type-ahead, and Escape. It also holds the menu open on copy so its own
 * confirmation is visible and a second value can be taken in the same trip.
 *
 * Keyboard check for this story: focus the trigger, Enter to open, ArrowDown /
 * ArrowUp to move, type "tail" to jump, Enter to copy, Escape to close.
 */
export const AsMenuItem: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Copy token…</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <CopyMenuItem value="#f8fafc">Copy HEX</CopyMenuItem>
        <CopyMenuItem value="bg-neutral-2">Copy Tailwind Class</CopyMenuItem>
        <CopyMenuItem value="var(--neutral-2)">Copy CSS Variable</CopyMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** `CopyableField` — value rendered inline with the button beside it. */
export const InlineField: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <CopyableField label="Tenant" value="org_2n8XqLp4vRt" />
      <CopyableField
        label="Webhook"
        value="https://api.nebutra.com/webhooks/inbound/2n8XqLp4vRtZ"
      />
    </div>
  ),
};
