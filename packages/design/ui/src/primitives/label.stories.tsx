import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "Primitives/Label",
  component: Label,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Native `<label>` element for form controls. Pairs with `htmlFor`/`id` for click-to-focus and screen-reader association, and reads `peer-disabled:*` off a sibling `peer` control so it dims automatically — it does not take a `disabled` prop of its own. Prefer the `Field` primitive when you also need helper/error text; reach for bare `Label` when you're composing a control by hand.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: { children: "Email address", htmlFor: "email-default" },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Label {...args} />
      <Input id="email-default" type="email" placeholder="you@example.com" />
    </div>
  ),
};

/**
 * A `<span className="text-destructive">*</span>` marks a required field —
 * this is a plain child, not a prop, because `Label` renders whatever you
 * give it.
 */
export const Required: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="project-name">
        Project name <span className="text-destructive">*</span>
      </Label>
      <Input id="project-name" placeholder="my-awesome-project" required />
    </div>
  ),
};

/**
 * `Label` has no `disabled` prop of its own — `peer-disabled:opacity-70` is
 * baked into `labelVariants` and reads Tailwind's `:disabled` pseudo-class
 * off a DOM sibling carrying the `peer` class. Demonstrated here with a
 * native checkbox (outside `apps/**`, so the raw-input rule does not apply)
 * because `Checkbox` renders as a `<label>` wrapping its input, and `<label>`
 * elements have no `:disabled` state for `peer-disabled` to read.
 */
export const WithDisabledPeer: Story = {
  name: "Disabled peer control",
  render: () => (
    <div className="flex items-center gap-2">
      <input id="terms" type="checkbox" disabled className="peer size-4" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const LongLabel: Story = {
  name: "Overflow (long label text)",
  render: () => (
    <div className="flex max-w-64 flex-col gap-2">
      <Label htmlFor="scopes">
        Grant read and write access to every repository this integration can see, including private
        forks
      </Label>
      <Input id="scopes" placeholder="repo:read,write" />
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark flex flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-4">
      <Label htmlFor="dark-email">Email address</Label>
      <Input id="dark-email" type="email" placeholder="you@example.com" />
    </div>
  ),
};
