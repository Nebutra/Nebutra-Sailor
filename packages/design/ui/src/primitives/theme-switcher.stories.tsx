import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ThemeSwitcherValue } from "./theme-switcher";
import { ThemeSwitcher } from "./theme-switcher";

const meta = {
  title: "Primitives/ThemeSwitcher",
  component: ThemeSwitcher,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Compact pill toggle for light/dark/system theme switching. Integrates with next-themes or any controlled state. Hydration-safe with a skeleton placeholder during SSR.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    defaultValue: {
      control: "select",
      options: ["light", "dark", "system"],
    },
  },
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ThemeSwitcher defaultValue="system" />,
};

export const Controlled: Story = {
  render: () => {
    const [theme, setTheme] = useState<ThemeSwitcherValue>("system");
    return (
      <div className="flex flex-col items-center gap-4">
        <ThemeSwitcher value={theme} onChange={setTheme} />
        <span className="text-xs text-muted-foreground">
          Current: <strong>{theme}</strong>
        </span>
      </div>
    );
  },
};

export const DefaultLight: Story = {
  render: () => <ThemeSwitcher defaultValue="light" />,
};

export const DefaultDark: Story = {
  render: () => <ThemeSwitcher defaultValue="dark" />,
};

export const InNavbar: Story = {
  render: () => {
    const [theme, setTheme] = useState<ThemeSwitcherValue>("system");
    return (
      <div className="flex items-center justify-between rounded-xl border px-6 py-3 w-80">
        <span className="font-semibold text-sm">Nebutra</span>
        <div className="flex items-center gap-4">
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">
              Docs
            </a>
            <a href="/" className="hover:text-foreground">
              API
            </a>
          </nav>
          <ThemeSwitcher value={theme} onChange={setTheme} />
        </div>
      </div>
    );
  },
};

export const MultipleInstances: Story = {
  render: () => {
    const [theme, setTheme] = useState<ThemeSwitcherValue>("system");
    return (
      <div className="flex flex-col items-start gap-6">
        <div className="flex items-center gap-4">
          <span className="text-sm w-24 text-muted-foreground">Sidebar</span>
          <ThemeSwitcher value={theme} onChange={setTheme} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm w-24 text-muted-foreground">Settings</span>
          <ThemeSwitcher value={theme} onChange={setTheme} />
        </div>
        <p className="text-xs text-muted-foreground">
          Both switchers share the same state: <strong>{theme}</strong>
        </p>
      </div>
    );
  },
};
