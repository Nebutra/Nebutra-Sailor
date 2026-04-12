"use client";

import {
  Briefcase,
  Clock,
  Cpu,
  FileText,
  Globe,
  Home,
  Link,
  LockClosed,
  MagnifyingGlass,
  Message,
  Moon,
  Robot,
  Sun,
  User,
} from "@nebutra/icons";
import { Command } from "cmdk";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import * as React from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { usePathname, useRouter } from "@/i18n/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAV_COMMANDS = [
  { id: "home", label: "Home", href: "/", icon: Home, keywords: "index main" },
  {
    id: "work",
    label: "Work",
    href: "/work",
    icon: Briefcase,
    keywords: "projects portfolio",
  },
  {
    id: "thinking",
    label: "Thinking",
    href: "/thinking",
    icon: FileText,
    keywords: "blog articles essays writing",
  },
  {
    id: "now",
    label: "Now",
    href: "/now",
    icon: Clock,
    keywords: "current status update",
  },
  {
    id: "about",
    label: "About",
    href: "/about",
    icon: User,
    keywords: "bio background",
  },
  {
    id: "soul",
    label: "Soul",
    href: "/soul",
    icon: Robot,
    keywords: "ai chat clone digital",
  },
  {
    id: "uses",
    label: "Uses",
    href: "/uses",
    icon: Cpu,
    keywords: "tools stack setup gear",
  },
  {
    id: "links",
    label: "Links",
    href: "/links",
    icon: Link,
    keywords: "social bookmarks",
  },
  {
    id: "guestbook",
    label: "Guestbook",
    href: "/guestbook",
    icon: Message,
    keywords: "endorse comments",
  },
  {
    id: "privacy",
    label: "Privacy",
    href: "/privacy",
    icon: LockClosed,
    keywords: "data policy",
  },
];

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useLocale();
  const { track } = useAnalytics();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const navigate = (href: string) => {
    track("command_palette_navigate", { href });
    router.push(href as Parameters<typeof router.push>[0]);
    onOpenChange(false);
  };

  const switchLocale = (newLocale: string) => {
    track("command_palette_locale_switch", { from: locale, to: newLocale });
    router.replace(pathname, { locale: newLocale });
    onOpenChange(false);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    track("command_palette_theme_toggle", { theme: next });
    setTheme(next);
    onOpenChange(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className={`inset-0 fixed z-50 ${open ? "flex" : "hidden"} items-start justify-center pt-[20vh]`}
    >
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/useSemanticElements: ARIA headless structure */}
      <div
        className="inset-0 bg-black/40 backdrop-blur-sm absolute"
        role="button"
        tabIndex={-1}
        aria-label="Close command palette"
        onClick={() => onOpenChange(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange(false);
        }}
      />

      {/* Panel */}
      <div className="max-w-xl mx-4 relative z-10 w-full">
        <Command
          className="dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden rounded-2xl border border-gray-200 shadow-2xl"
          loop
        >
          <div className="gap-3 px-4 py-3 dark:border-gray-800/80 flex items-center border-b border-gray-100">
            <MagnifyingGlass className="h-4 w-4 text-gray-400 shrink-0" />
            <Command.Input
              ref={inputRef}
              placeholder="Search pages, actions..."
              className="text-sm text-gray-900 dark:text-white placeholder:text-gray-400 flex-1 bg-transparent outline-none"
            />
            <kbd className="sm:inline-flex rounded px-1.5 py-0.5 text-gray-400 hidden items-center border border-gray-200 font-mono text-[10px] dark:border-gray-700">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 py-2 overflow-y-auto overscroll-contain">
            <Command.Empty className="py-10 text-sm text-gray-400 text-center">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Pages"
              className="[&>[cmdk-group-heading]]:px-4 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:font-medium [&>[cmdk-group-heading]]:tracking-wider [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:text-[11px] [&>[cmdk-group-heading]]:uppercase"
            >
              {NAV_COMMANDS.map(({ id, label, href, icon: Icon, keywords }) => (
                <Command.Item
                  key={id}
                  value={`${label} ${keywords}`}
                  onSelect={() => navigate(href)}
                  className="gap-3 px-4 py-2.5 text-sm dark:data-[selected=true]:bg-gray-800 flex cursor-pointer items-center rounded-none text-gray-700 transition-colors data-[selected=true]:bg-gray-100 dark:text-gray-200"
                >
                  <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-1 dark:bg-gray-800 h-px bg-gray-100" />

            <Command.Group
              heading="Actions"
              className="[&>[cmdk-group-heading]]:px-4 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:font-medium [&>[cmdk-group-heading]]:tracking-wider [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:text-[11px] [&>[cmdk-group-heading]]:uppercase"
            >
              <Command.Item
                value={`theme toggle ${resolvedTheme === "dark" ? "light" : "dark"}`}
                onSelect={toggleTheme}
                className="gap-3 px-4 py-2.5 text-sm dark:data-[selected=true]:bg-gray-800 flex cursor-pointer items-center rounded-none text-gray-700 transition-colors data-[selected=true]:bg-gray-100 dark:text-gray-200"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <Moon className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                {resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </Command.Item>

              {(["en", "zh", "ja"] as const)
                .filter((l) => l !== locale)
                .map((l) => (
                  <Command.Item
                    key={l}
                    value={`language ${l} ${LOCALE_LABELS[l]}`}
                    onSelect={() => switchLocale(l)}
                    className="gap-3 px-4 py-2.5 text-sm dark:data-[selected=true]:bg-gray-800 flex cursor-pointer items-center rounded-none text-gray-700 transition-colors data-[selected=true]:bg-gray-100 dark:text-gray-200"
                  >
                    <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                    Switch to {LOCALE_LABELS[l]}
                  </Command.Item>
                ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
