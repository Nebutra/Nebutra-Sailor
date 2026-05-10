import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { AtSign, DollarSign, Eye, EyeOff, Mail, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Text input control. h-10 (40px) locked per component tokens. Supports prefix/suffix adornments and a built-in clearable mode.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "tel", "url"],
    },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    clearable: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-72">
      <Input size="sm" placeholder="Small" />
      <Input size="md" placeholder="Default" />
      <Input size="lg" placeholder="Large" />
    </div>
  ),
};

// ─── Base States ──────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { placeholder: "Enter value…", type: "text" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the input element and focus it
    const input = canvas.getByRole("textbox");
    await userEvent.click(input);

    // Type "hello world" into the input
    await userEvent.type(input, "hello world");

    // Verify the input value is "hello world"
    expect(input).toHaveValue("hello world");

    // Clear the input with triple-click to select all, then Delete
    await userEvent.tripleClick(input);
    await userEvent.keyboard("{Delete}");

    // Verify the input is now empty
    expect(input).toHaveValue("");
  },
};

export const WithValue: Story = {
  args: { defaultValue: "contact@nebutra.com", type: "email" },
};

export const Password: Story = {
  args: { placeholder: "Password", type: "password" },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled input", disabled: true },
};

// ─── Labelled Field ───────────────────────────────────────────────────────────

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="email-field">
        Email address
      </label>
      <Input id="email-field" type="email" placeholder="contact@nebutra.com" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="error-field">
        Email address
      </label>
      <Input
        id="error-field"
        type="email"
        defaultValue="not-an-email"
        className="border-destructive focus-visible:ring-destructive"
        aria-invalid="true"
      />
      <p className="text-xs text-destructive">Please enter a valid email address.</p>
    </div>
  ),
};

// ─── Prefix ───────────────────────────────────────────────────────────────────

export const WithPrefix: Story = {
  name: "Prefix — Search icon",
  render: () => (
    <Input prefix={<Search className="h-4 w-4" />} placeholder="Search…" type="search" />
  ),
};

export const WithEmailPrefix: Story = {
  name: "Prefix — Mail icon",
  render: () => (
    <Input prefix={<Mail className="h-4 w-4" />} type="email" placeholder="contact@nebutra.com" />
  ),
};

// ─── Suffix ───────────────────────────────────────────────────────────────────

export const WithSuffix: Story = {
  name: "Suffix — Domain text",
  render: () => (
    <Input suffix={<span className="text-xs">@nebutra.com</span>} placeholder="username" />
  ),
};

export const WithAtSuffix: Story = {
  name: "Suffix — @ icon",
  render: () => <Input suffix={<AtSign className="h-4 w-4" />} placeholder="username" />,
};

// ─── Clearable ────────────────────────────────────────────────────────────────

export const Clearable: Story = {
  name: "Clearable (uncontrolled)",
  render: () => (
    <Input clearable defaultValue="contact@nebutra.com" placeholder="Type to see the × button…" />
  ),
};

export const ClearableControlled: Story = {
  name: "Clearable (controlled)",
  render: () => {
    const [value, setValue] = useState("contact@nebutra.com");
    return (
      <div className="flex flex-col gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          clearable
          onClear={() => setValue("")}
          placeholder="Controlled clearable…"
        />
        <p className="text-xs text-muted-foreground">
          Value: <code className="font-mono">{value === "" ? "(empty)" : value}</code>
        </p>
      </div>
    );
  },
};

// ─── Combinations ─────────────────────────────────────────────────────────────

export const SearchWithClearable: Story = {
  name: "Prefix + Clearable",
  render: () => <Input prefix={<Search className="h-4 w-4" />} clearable placeholder="Search…" />,
};

export const CurrencyInput: Story = {
  name: "Prefix + Suffix (currency)",
  render: () => (
    <Input
      prefix={<DollarSign className="h-4 w-4" />}
      suffix={<span className="text-xs font-medium">USD</span>}
      type="number"
      placeholder="0.00"
    />
  ),
};

export const PasswordReveal: Story = {
  name: "Suffix — password reveal",
  render: () => {
    const [shown, setShown] = useState(false);
    const Icon = shown ? EyeOff : Eye;
    return (
      <div className="relative">
        <Input
          type={shown ? "text" : "password"}
          placeholder="Enter password…"
          suffix={undefined}
          // Interactive suffix: built manually for full pointer-events control
          className="pr-9"
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          onClick={() => setShown((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  },
};

// ─── Shortcut (KK) ────────────────────────────────────────────────────────────

export const Shortcut: Story = {
  name: "Shortcut / KK",
  render: () => (
    <div className="flex flex-col gap-3 w-72">
      <Input placeholder="Search commands…" shortcut="⌘K" />
      <p className="text-xs text-muted-foreground">
        Type to see the shortcut badge transition to a loading spinner.
      </p>
    </div>
  ),
};

// ─── All Types ────────────────────────────────────────────────────────────────

export const AllTypes: Story = {
  name: "All Types",
  render: () => (
    <div className="flex flex-col gap-3 w-72">
      <Input type="text" placeholder="Text" />
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Input type="number" placeholder="Number" />
      <Input type="search" placeholder="Search…" />
      <Input type="tel" placeholder="Phone" />
      <Input type="url" placeholder="https://…" />
    </div>
  ),
};
