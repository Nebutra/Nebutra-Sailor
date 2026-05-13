"use client";

import { useAuth } from "@nebutra/auth/client";
import { useTheme } from "@nebutra/tokens";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFeedbackDialog } from "@/components/feedback/feedback-dialog-provider";
import { usePermission } from "@/hooks/usePermission";
import { useCommandPalette } from "./command-palette-provider";
import {
  COMMANDS,
  type CommandContext,
  type CommandDefinition,
  type CommandSection,
  filterCommandsByPermission,
  groupBySection,
  SECTION_ORDER,
} from "./commands";

interface CommandPaletteProps {
  /**
   * Optional override for the navigate handler. The default routes via
   * `next/navigation`. Tests can stub this.
   */
  onNavigate?: (href: string) => void;
  /** Optional override for sign-out handling (defaults to Clerk signOut). */
  onSignOut?: () => void;
  /** Optional override for the org-switcher trigger. */
  onSwitchOrganization?: () => void;
}

export function CommandPalette({
  onNavigate,
  onSignOut,
  onSwitchOrganization,
}: CommandPaletteProps = {}) {
  const { open, setOpen } = useCommandPalette();
  const { openDialog: openFeedback } = useFeedbackDialog();
  const { setTheme } = useTheme();
  const { signOut } = useAuth();
  const { can } = usePermission();
  const router = useRouter();
  const t = useTranslations("commandPalette");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Build the imperative context handlers receive when invoked.
  const ctx = useMemo<CommandContext>(
    () => ({
      navigate: (href: string) => {
        if (onNavigate) {
          onNavigate(href);
          return;
        }
        router.push(href);
      },
      setTheme: (choice) => setTheme(choice),
      signOut: () => {
        if (onSignOut) {
          onSignOut();
          return;
        }
        void signOut();
      },
      switchOrganization: () => {
        if (onSwitchOrganization) {
          onSwitchOrganization();
          return;
        }
        // Default fallback: navigate to org settings.
        router.push("/settings/organization");
      },
      openFeedback,
    }),
    [onNavigate, onSignOut, onSwitchOrganization, openFeedback, router, setTheme, signOut],
  );

  // Visible commands respect permissions; recompute when permissions change.
  const visibleByPermission = useMemo(() => filterCommandsByPermission(COMMANDS, can), [can]);

  const grouped = useMemo(() => groupBySection(visibleByPermission), [visibleByPermission]);

  const handleSelect = useCallback(
    (command: CommandDefinition) => {
      try {
        command.handler(ctx);
      } catch (error) {
        console.error("Command palette handler failed", error);
      } finally {
        setOpen(false);
      }
    },
    [ctx, setOpen],
  );

  // Close on ESC at the top level so we don't depend on focus location.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  // Focus the input when palette opens.
  useEffect(() => {
    if (open) {
      // Defer to next tick so cmdk has mounted the input.
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const sectionLabel = (section: CommandSection) => t(`sections.${section}`);

  return (
    <div
      data-testid="command-palette-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
      role="presentation"
      // Click-outside to close
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <Command
        // biome-ignore lint/a11y/useSemanticElements: cmdk renders its own dialog semantics
        role="dialog"
        aria-label={t("ariaLabel")}
        aria-modal="true"
        label={t("ariaLabel")}
        loop
        className="w-full max-w-xl overflow-hidden rounded-xl border border-neutral-7 bg-neutral-1 shadow-2xl dark:border-white/10 dark:bg-neutral-2"
      >
        <div className="border-b border-neutral-7 px-4 dark:border-white/10">
          <Command.Input
            ref={inputRef}
            placeholder={t("placeholder")}
            className="h-12 w-full bg-transparent text-sm text-neutral-12 placeholder:text-neutral-10 focus:outline-none"
          />
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-neutral-11">
            {t("empty")}
          </Command.Empty>

          {SECTION_ORDER.map((section) => {
            const items = grouped[section];
            if (items.length === 0) return null;
            return (
              <Command.Group
                key={section}
                heading={sectionLabel(section)}
                className="px-1 py-1 text-xs font-medium text-neutral-10 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
              >
                {items.map((command) => {
                  const Icon = command.icon;
                  const title = t(`commands.${command.titleKey}`);
                  const keywords = [title, ...(command.tags ?? []), section].filter(Boolean);
                  return (
                    <Command.Item
                      key={command.id}
                      value={command.id}
                      keywords={keywords}
                      onSelect={() => handleSelect(command)}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-neutral-12 aria-selected:bg-neutral-3 aria-selected:text-neutral-12 dark:aria-selected:bg-white/10"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-neutral-11" aria-hidden />
                      <span className="flex-1">{title}</span>
                      {command.shortcut ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-neutral-10">
                          {command.shortcut.map((key) => (
                            <kbd
                              key={key}
                              className="rounded border border-neutral-7 bg-neutral-2 px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-white/5"
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      ) : null}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
