import { Dollar as DollarSign, Envelope as Mail, MagnifyingGlass as Search } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
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
          "Token-driven single-line text input. Supports strict labelled usage, helper/error text, non-interactive affixes, clearable search, and shortcut hints.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "tel", "url", "file"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    clearable: { control: "boolean" },
    loading: { control: "boolean" },
    revealable: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

function ClearableSearchDemo() {
  const [value, setValue] = useState("build logs");

  return (
    <Input
      aria-label="Search logs"
      type="search"
      value={value}
      onValueChange={setValue}
      prefix={<Search aria-hidden="true" />}
      clearable
      placeholder="Search logs"
    />
  );
}

function SearchShortcutDemo() {
  const [value, setValue] = useState("");

  return (
    <Input
      aria-label="Search commands"
      type="search"
      value={value}
      onValueChange={setValue}
      prefix={<Search aria-hidden="true" />}
      shortcut="⌘K"
      placeholder="Search commands"
    />
  );
}

export const Default: Story = {
  args: {
    "aria-label": "Project name",
    placeholder: "my-awesome-project",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Project name" });

    await userEvent.click(input);
    await userEvent.type(input, "hello-world");

    expect(input).toHaveValue("hello-world");
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input aria-label="Small project slug" size="sm" placeholder="Small" />
      <Input aria-label="Default project slug" placeholder="Default" />
      <Input aria-label="Large project slug" size="lg" placeholder="Large" />
    </div>
  ),
};

export const WithLabelAndDescription: Story = {
  render: () => (
    <Input
      id="project-name"
      label="Project Name"
      placeholder="my-awesome-project"
      description="Use lowercase letters, numbers, and hyphens."
    />
  ),
};

export const ErrorState: Story = {
  render: () => (
    <Input
      id="domain"
      label="Domain"
      defaultValue="not a domain"
      error="Domain must be a valid hostname."
    />
  ),
};

export const PrefixAndSuffix: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input
        aria-label="Search projects"
        type="search"
        prefix={<Search aria-hidden="true" />}
        placeholder="Search projects"
      />
      <Input
        aria-label="Repository URL"
        prefix="https://"
        suffix=".vercel.app"
        placeholder="my-project"
      />
      <Input
        aria-label="Monthly spend"
        type="number"
        prefix={<DollarSign aria-hidden="true" />}
        suffix="USD"
        placeholder="0.00"
      />
      <Input
        aria-label="Team email"
        type="email"
        prefix={<Mail aria-hidden="true" />}
        placeholder="team@example.com"
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input aria-label="Disabled placeholder" disabled placeholder="Disabled with placeholder" />
      <Input aria-label="Disabled value" disabled value="Disabled with value" readOnly />
      <Input
        aria-label="Disabled with prefix"
        disabled
        prefix="https://"
        placeholder="disabled-project"
      />
      <Input aria-label="Disabled with suffix" disabled suffix=".com" placeholder="example" />
    </div>
  ),
};

export const ClearableSearch: Story = {
  render: () => <ClearableSearchDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox", { name: "Search logs" });
    const clear = canvas.getByRole("button", { name: "Clear input" });

    expect(input).toHaveValue("build logs");
    await userEvent.click(clear);
    expect(input).toHaveValue("");
  },
};

export const SearchShortcut: Story = {
  render: () => <SearchShortcutDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox", { name: "Search commands" });

    await userEvent.click(input);
    await userEvent.type(input, "deploy");
    expect(input).toHaveValue("deploy");

    await userEvent.keyboard("{Escape}");
    expect(input).toHaveValue("");
  },
};

export const Loading: Story = {
  args: {
    "aria-label": "Saving environment variable",
    value: "DATABASE_URL",
    loading: true,
    readOnly: true,
  },
};

export const LongValue: Story = {
  args: {
    "aria-label": "Long token",
    defaultValue: "example_token_nebutra_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    clearable: true,
  },
};

export const FileInput: Story = {
  render: () => (
    <Input
      id="config-file"
      label="Configuration File"
      type="file"
      description="Upload a JSON or YAML environment preset."
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Configuration File");
    const file = new File(["{}"], "production.json", { type: "application/json" });

    await userEvent.upload(input, file);

    expect(input).toHaveProperty("files");
    expect((input as HTMLInputElement).files?.[0]?.name).toBe("production.json");
  },
};

export const PasswordReveal: Story = {
  render: () => (
    <Input aria-label="Password" type="password" revealable placeholder="Enter password" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Password");
    const show = canvas.getByRole("button", { name: "Show password" });

    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(show);
    expect(input).toHaveAttribute("type", "text");
    expect(canvas.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] border border-border bg-background p-4 text-foreground">
      <Input
        id="dark-domain"
        label="Domain"
        prefix="https://"
        suffix=".nebutra.app"
        defaultValue="docs"
        description="Dark mode uses the same semantic contract."
      />
    </div>
  ),
};
