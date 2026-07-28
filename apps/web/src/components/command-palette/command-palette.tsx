"use client";

import { useAuth } from "@nebutra/auth/client";
import { useTheme } from "@nebutra/tokens";
import { CommandMenu } from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo } from "react";
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
        router.push("/settings/organization");
      },
      openFeedback,
    }),
    [onNavigate, onSignOut, onSwitchOrganization, openFeedback, router, setTheme, signOut],
  );

  const visibleByPermission = useMemo(() => filterCommandsByPermission(COMMANDS, can), [can]);

  const grouped = useMemo(() => groupBySection(visibleByPermission), [visibleByPermission]);

  const handleSelect = useCallback(
    (command: CommandDefinition) => {
      try {
        command.handler(ctx);
      } catch (error) {
        // Prefer structured logger in app code; console.error is allowed for
        // unexpected handler failures in the palette (Biome).
        console.error("Command palette handler failed", error);
      } finally {
        setOpen(false);
      }
    },
    [ctx, setOpen],
  );

  const sectionLabel = (section: CommandSection) => t(`sections.${section}`);

  // Escape at window level — independent of Dialog focus (a11y + existing tests).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  // Keep closed state unmounted so tests and consumers can assert absence.
  // CommandMenu.Root still needs open/setOpen for internal Dialog control.
  if (!open) return null;

  return (
    <div data-testid="command-palette-overlay">
      <CommandMenu.Root open={open} setOpen={setOpen} label={t("ariaLabel")}>
        <CommandMenu.Input placeholder={t("placeholder")} />
        <CommandMenu.List>
          <CommandMenu.Empty>{t("empty")}</CommandMenu.Empty>
          {SECTION_ORDER.map((section) => {
            const items = grouped[section];
            if (items.length === 0) return null;
            return (
              <CommandMenu.Group key={section} heading={sectionLabel(section)}>
                {items.map((command) => {
                  const Icon = command.icon;
                  const title = t(`commands.${command.titleKey}`);
                  return (
                    <CommandMenu.Item
                      key={command.id}
                      value={command.id}
                      keywords={[title, ...(command.tags ?? []), section].filter(Boolean)}
                      callback={() => handleSelect(command)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-neutral-11" aria-hidden />
                      <span className="flex-1">{title}</span>
                      {command.shortcut ? (
                        <CommandMenu.Shortcut keys={command.shortcut} label={`${title} shortcut`} />
                      ) : null}
                    </CommandMenu.Item>
                  );
                })}
              </CommandMenu.Group>
            );
          })}
        </CommandMenu.List>
      </CommandMenu.Root>
    </div>
  );
}
