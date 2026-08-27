import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { ThemeToggle, type ThemeToggleValue } from "./theme-toggle";

const meta = {
  title: "Primitives/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Binary icon-button for light/dark theme toggles. Use ThemeSwitcher when the UI must expose system preference.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    sound: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledToggle({ initial = "light" }: { initial?: ThemeToggleValue }) {
  const [theme, setTheme] = useState<ThemeToggleValue>(initial);

  return (
    <div className="flex flex-col items-center gap-3">
      <ThemeToggle value={theme} onChange={setTheme} />
      <span className="rounded-[var(--radius-sm)] bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
        {theme}
      </span>
    </div>
  );
}

export const Default: Story = {
  render: () => <ControlledToggle />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Switch to dark theme" });

    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(canvas.getByRole("button", { name: "Switch to light theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const Dark: Story = {
  render: () => <ControlledToggle initial="dark" />,
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ThemeToggle aria-label="Small theme toggle" defaultValue="light" size="sm" />
      <ThemeToggle aria-label="Medium theme toggle" defaultValue="light" size="md" />
      <ThemeToggle aria-label="Large theme toggle" defaultValue="light" size="lg" />
    </div>
  ),
};

export const DarkSurface: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] border bg-background p-6 text-foreground">
      <ThemeToggle defaultValue="dark" />
    </div>
  ),
};

export const CustomLabels: Story = {
  render: () => (
    <ThemeToggle
      defaultValue="light"
      labels={{
        dark: "Use dark canvas",
        light: "Use light canvas",
      }}
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ThemeToggle defaultValue="light" disabled />
      <ThemeToggle defaultValue="dark" disabled />
    </div>
  ),
};

export const OptionalSound: Story = {
  render: () => <ThemeToggle defaultValue="light" sound />,
  parameters: {
    docs: {
      description: {
        story:
          "Sound is opt-in and only plays after a user gesture. Keep it disabled for routine enterprise surfaces.",
      },
    },
  },
};
