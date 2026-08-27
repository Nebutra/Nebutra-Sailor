import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import type * as React from "react";
import { Button } from "./button";
import { Field } from "./field";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";

/**
 * `Field` is the label + description + error shell that CLAUDE.md's form-controls
 * rule points every governed form in `apps/**` at — and it had no story, the
 * largest documentation-versus-reality gap on the storyless list.
 *
 * It is deliberately the *static* counterpart to `Form`: no react-hook-form, no
 * context, no generated id. That has one consequence a story has to be honest
 * about — the caller owns the id. `htmlFor` must be passed and must match the
 * control's `id`, or the label is decorative and clicking it does nothing.
 * `LabelAssociation` asserts that, and `WithoutHtmlFor` shows the broken case
 * next to the correct one rather than pretending the prop is optional in
 * practice.
 *
 * Note also that `description` and `error` are mutually exclusive by design:
 * when `error` is set the description is removed from the DOM, not merely styled
 * down, so an error hides the hint the user may still need.
 */

const meta = {
  title: "Primitives/Field",
  component: Field,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Static label/description/error wrapper for a single control. Use it for uncontrolled and server-action forms; use Form + FormField when react-hook-form owns the state.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    label: "Display name",
    htmlFor: "display-name",
  },
  argTypes: {
    error: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof Field>;

const WIDTH = "w-[360px]";

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-[360px] flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {note ? <p className="text-xs text-muted-foreground/80">{note}</p> : null}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

export const Default: Story = {
  render: (args) => (
    <div className={WIDTH}>
      <Field {...args} description="Shown to everyone in your workspace.">
        <Input id="display-name" name="displayName" placeholder="Ada Lovelace" />
      </Field>
    </div>
  ),
};

/**
 * The four states the component actually has (bare, described, errored,
 * disabled) crossed with the control types it wraps, plus overflow: a label and
 * an error long enough to wrap, and a value wider than the control.
 */
export const AllVariants: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-start gap-10">
      <Panel title="States">
        <Field label="Bare" htmlFor="bare">
          <Input id="bare" placeholder="No description, no error" />
        </Field>
        <Field label="With description" htmlFor="described" description="Two to sixty characters.">
          <Input id="described" placeholder="Ada Lovelace" />
        </Field>
        <Field
          label="With error"
          htmlFor="errored"
          description="This description is REMOVED while the error is set."
          error="Display name is required"
        >
          <Input id="errored" defaultValue="" aria-invalid />
        </Field>
        <Field label="Disabled" htmlFor="disabled-field" description="Managed by your workspace.">
          <Input id="disabled-field" defaultValue="Ada Lovelace" disabled />
        </Field>
      </Panel>

      <Panel
        title="Control types"
        note="Field is control-agnostic — it renders whatever child it is given and never touches its props."
      >
        <Field label="Email" htmlFor="v-email" description="Used for sign-in.">
          <Input id="v-email" type="email" placeholder="ada@example.com" />
        </Field>
        <Field label="Bio" htmlFor="v-bio" description="Optional.">
          <Textarea id="v-bio" rows={3} placeholder="One line about you" />
        </Field>
        <Field label="Plan" htmlFor="v-plan" description="Changes take effect immediately.">
          <Select name="plan" defaultValue="pro">
            <SelectTrigger id="v-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hobby">Hobby</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Panel>

      <Panel
        title="Overflow"
        note="Label, description and error all wrap; the grid gap keeps the rhythm when they do."
      >
        <Field
          label="Primary billing contact for the organization and all of its child workspaces"
          htmlFor="v-long-label"
          description="If this address bounces we fall back to the workspace owner, then to the account owner, then we stop trying."
        >
          <Input id="v-long-label" placeholder="ada@example.com" />
        </Field>
        <Field
          label="Workspace URL"
          htmlFor="v-long-error"
          error="Lowercase letters, numbers and dashes only — this one contains an underscore at position 9 and a capital at position 14"
        >
          <Input id="v-long-error" defaultValue="ada_love_LACE" aria-invalid />
        </Field>
        <Field label="Value wider than the control" htmlFor="v-long-value">
          <Input
            id="v-long-value"
            defaultValue="augusta-ada-king-noel-countess-of-lovelace-and-adjacent-territories"
          />
        </Field>
      </Panel>
    </div>
  ),
};

/** The error row. Note the description is gone, not dimmed. */
export const ErrorState: Story = {
  render: () => (
    <div className={`${WIDTH} flex flex-col gap-6`}>
      <Field
        label="Workspace URL"
        htmlFor="slug-clean"
        description="Lowercase letters, numbers and dashes."
      >
        <Input id="slug-clean" defaultValue="ada-lovelace" />
      </Field>
      <Field
        label="Workspace URL"
        htmlFor="slug-error"
        description="Lowercase letters, numbers and dashes."
        error="That URL is already taken"
      >
        <Input id="slug-error" defaultValue="ada-lovelace" aria-invalid />
      </Field>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Same description on both fields; only the clean one still renders it.
    await expect(canvas.getAllByText("Lowercase letters, numbers and dashes.")).toHaveLength(1);
    await expect(canvas.getByText("That URL is already taken")).toBeInTheDocument();
  },
};

/** Nothing typed and nothing to say about it — the smallest legitimate usage. */
export const EmptyState: Story = {
  render: () => (
    <div className={WIDTH}>
      <Field label="Search" htmlFor="empty-search">
        <Input id="empty-search" placeholder="Nothing typed yet" />
      </Field>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className={WIDTH}>
      <Field label="Organization ID" htmlFor="org-id" description="Read-only. Managed by billing.">
        <Input id="org-id" defaultValue="org_2xKp91QvbA" disabled />
      </Field>
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <div className={`${WIDTH} flex flex-col gap-6`}>
      <Field
        label="Primary billing contact for the organization and all of its child workspaces"
        htmlFor="long-1"
        description="If this address bounces we fall back to the workspace owner, then to the account owner, then we stop trying."
      >
        <Input id="long-1" placeholder="ada@example.com" />
      </Field>
      <Field
        label="Workspace URL"
        htmlFor="long-2"
        error="Lowercase letters, numbers and dashes only — this one contains an underscore at position 9 and a capital at position 14"
      >
        <Input id="long-2" defaultValue="ada_love_LACE" aria-invalid />
      </Field>
    </div>
  ),
};

/**
 * `htmlFor` is the whole contract. Asserted rather than assumed, because a
 * mismatch is invisible: the label still renders, still sits in the right place,
 * and still looks like a label — it just stops being one.
 */
export const LabelAssociation: Story = {
  render: () => (
    <div className={WIDTH}>
      <Field label="Display name" htmlFor="assoc-input" description="Two to sixty characters.">
        <Input id="assoc-input" placeholder="Ada Lovelace" />
      </Field>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // getByLabelText resolves only through a real htmlFor→id link.
    const input = canvas.getByLabelText("Display name");
    await expect(input).toHaveAttribute("id", "assoc-input");
  },
};

/**
 * The failure mode, shown deliberately. Left: `htmlFor` matches. Right: it is
 * omitted, so the `<label>` has no `for` and the control has no accessible name
 * — clicking the text does not focus the input, and a screen reader reads an
 * unlabelled textbox.
 *
 * Field cannot fix this itself without generating an id and cloning the child,
 * which is exactly what `Form`'s `FormControl` does. Until it does, the
 * assertion below is what stops the two from being confused.
 */
export const WithoutHtmlFor: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-start gap-10">
      <Panel title="Correct — htmlFor matches the control id">
        <Field label="Contact email" htmlFor="ok-email" description="Used for receipts.">
          <Input id="ok-email" placeholder="ada@example.com" />
        </Field>
      </Panel>
      <Panel title="Broken — htmlFor omitted">
        <Field label="Unlinked email" description="Used for receipts.">
          <Input placeholder="ada@example.com" />
        </Field>
      </Panel>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Contact email")).toBeInTheDocument();
    // No association exists, so the label text cannot reach the control.
    await expect(canvas.queryByLabelText("Unlinked email")).toBeNull();
  },
};

/**
 * A form built entirely from `Field`, which is the shape the CLAUDE.md rule
 * actually asks for — including a `type="hidden"` input carrying form data, the
 * one native-input case the lint rule exempts.
 */
export const InForm: Story = {
  render: () => (
    <form
      className="flex w-[420px] flex-col gap-5"
      onSubmit={(event) => event.preventDefault()}
      noValidate
    >
      <input data-allow-native type="hidden" name="orgId" value="org_2xKp91QvbA" readOnly />
      <Field label="Display name" htmlFor="f-name" description="Two to sixty characters.">
        <Input id="f-name" name="displayName" defaultValue="Ada Lovelace" />
      </Field>
      <Field label="Email" htmlFor="f-email" error="That address is already in use">
        <Input id="f-email" name="email" type="email" defaultValue="ada@example.com" aria-invalid />
      </Field>
      <Field label="Plan" htmlFor="f-plan" description="Changes take effect immediately.">
        <Select name="plan" defaultValue="pro">
          <SelectTrigger id="f-plan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hobby">Hobby</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Bio" htmlFor="f-bio" description="Optional.">
        <Textarea id="f-bio" name="bio" rows={3} placeholder="One line about you" />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  ),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" }, layout: "padded" },
  render: () => (
    <div className="flex flex-col gap-5">
      <Field label="Display name" htmlFor="m-name" description="Two to sixty characters.">
        <Input id="m-name" placeholder="Ada Lovelace" />
      </Field>
      <Field
        label="Workspace URL"
        htmlFor="m-slug"
        error="Lowercase letters, numbers and dashes only"
      >
        <Input id="m-slug" defaultValue="ada_love_LACE" aria-invalid />
      </Field>
    </div>
  ),
};

/**
 * The error text and the errored label both use `text-destructive`, which is a
 * different hue in dark mode — this is the story that catches it going muddy.
 */
export const DarkMode: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="dark flex w-[400px] flex-col gap-6 rounded-[var(--radius-md)] bg-background p-8 text-foreground">
      <Field label="Display name" htmlFor="d-name" description="Two to sixty characters.">
        <Input id="d-name" placeholder="Ada Lovelace" />
      </Field>
      <Field
        label="Workspace URL"
        htmlFor="d-slug"
        error="Lowercase letters, numbers and dashes only"
      >
        <Input id="d-slug" defaultValue="ada_love_LACE" aria-invalid />
      </Field>
      <Field label="Organization ID" htmlFor="d-org" description="Read-only.">
        <Input id="d-org" defaultValue="org_2xKp91QvbA" disabled />
      </Field>
    </div>
  ),
};
