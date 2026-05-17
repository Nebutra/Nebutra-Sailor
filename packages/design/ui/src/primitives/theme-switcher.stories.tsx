import { ThemeProvider } from "@nebutra/tokens";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { ThemeSwitcher, type ThemeSwitcherValue } from "./theme-switcher";

const meta = {
  title: "Primitives/ThemeSwitcher",
  component: ThemeSwitcher,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Canonical Light/System/Dark selector bound to @nebutra/tokens ThemeProvider, with read-only forcedTheme handling and fixed geometry.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["small", "medium"],
    },
  },
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoryThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode;
  forcedTheme?: ThemeSwitcherValue;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={forcedTheme}>
      {children}
    </ThemeProvider>
  );
}

export const Default: Story = {
  render: () => (
    <StoryThemeProvider>
      <ThemeSwitcher />
    </StoryThemeProvider>
  ),
};

export const Small: Story = {
  render: () => (
    <StoryThemeProvider>
      <ThemeSwitcher size="small" />
    </StoryThemeProvider>
  ),
};

export const Disabled: Story = {
  render: () => (
    <StoryThemeProvider>
      <ThemeSwitcher disabled />
    </StoryThemeProvider>
  ),
};

export const ForcedTheme: Story = {
  render: () => (
    <StoryThemeProvider forcedTheme="dark">
      <ThemeSwitcher />
    </StoryThemeProvider>
  ),
};

export const ControlledCompatibility: Story = {
  render: () => {
    const [theme, setTheme] = React.useState<ThemeSwitcherValue>("system");

    return (
      <div className="grid gap-3">
        <ThemeSwitcher value={theme} onChange={setTheme} />
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{theme}</span>
        </p>
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark rounded-lg bg-background p-4">
      <StoryThemeProvider forcedTheme="dark">
        <ThemeSwitcher />
      </StoryThemeProvider>
    </div>
  ),
};
