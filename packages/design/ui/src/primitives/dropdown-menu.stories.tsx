"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuFilterInput,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "Primitives/DropdownMenu",
  component: DropdownMenuContent,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Base UI menu primitive with keyboard navigation, checkbox items, submenus, and positioning.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DropdownMenuContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Project</DropdownMenuLabel>
        <DropdownMenuItem>
          Rename
          <DropdownMenuShortcut>R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Production protected</DropdownMenuCheckboxItem>
        <DropdownMenuItem disabled>Rotate secrets</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

const LANGUAGES = [
  { id: "en-US", label: "English" },
  { id: "de-DE", label: "Deutsch" },
  { id: "es-ES", label: "Español" },
  { id: "fr-FR", label: "Français" },
  { id: "ja-JP", label: "日本語" },
  { id: "ko-KR", label: "한국어" },
  { id: "pt-BR", label: "Português" },
  { id: "zh-Hans-CN", label: "简体中文" },
] as const;

/**
 * The shape the sidebar account menu needs: nested submenus, single-select radio
 * groups, and a text filter over a long list. Keyboard contract to check here —
 * arrows and Home/End walk the items, printable characters type-ahead in the
 * menu but land in the field once `DropdownMenuFilterInput` has focus,
 * ArrowDown leaves the field for the first match, and Escape closes.
 */
export const WithSubmenusAndFilter: Story = {
  render: () => {
    const [theme, setTheme] = useState("system");
    const [language, setLanguage] = useState<string>("en-US");
    const [query, setQuery] = useState("");
    const matches = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return LANGUAGES;
      return LANGUAGES.filter(
        (l) => l.label.toLowerCase().includes(q) || l.id.toLowerCase().includes(q),
      );
    }, [query]);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(next) => setTheme(String(next))}
              >
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Language</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <div className="p-1">
                <DropdownMenuFilterInput
                  value={query}
                  placeholder="Search languages…"
                  aria-label="Search languages"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {matches.length === 0 ? (
                <DropdownMenuEmpty>No languages match</DropdownMenuEmpty>
              ) : (
                <DropdownMenuRadioGroup
                  value={language}
                  onValueChange={(next) => setLanguage(String(next))}
                >
                  {matches.map((entry) => (
                    <DropdownMenuRadioItem key={entry.id} value={entry.id}>
                      {entry.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
};
