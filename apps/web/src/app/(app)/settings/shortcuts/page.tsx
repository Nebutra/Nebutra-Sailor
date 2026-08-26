"use client";

import { Table } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  COMMANDS,
  type CommandDefinition,
  type CommandSection,
  SECTION_ORDER,
} from "@/components/command-palette/commands";
import { usePermission } from "@/hooks/usePermission";

// Both shortcut tables are flush inside their own bordered panel and keep the
// settings-page 16px/12px cell rhythm rather than the default table density.
const SHORTCUT_DENSITY = { "--table-cell-padding-x": "1rem", "--table-cell-padding-y": "0.75rem" };

const GLOBAL_SHORTCUTS: Array<{ keys: string[]; label: string; description: string }> = [
  {
    keys: ["⌘", "K"],
    label: "Open command palette",
    description: "Search and run any command from anywhere in the app.",
  },
  {
    keys: ["⌘", "B"],
    label: "Toggle sidebar",
    description: "Collapse or expand the navigation sidebar.",
  },
  {
    keys: ["Esc"],
    label: "Close overlay",
    description: "Close the command palette, dialog, or modal.",
  },
  {
    keys: ["Enter"],
    label: "Submit / send",
    description: "Send a chat message or confirm the focused action.",
  },
  {
    keys: ["⇧", "Enter"],
    label: "Newline in chat",
    description: "Insert a line break in the chat input without sending.",
  },
];

function groupVisible(
  commands: ReadonlyArray<CommandDefinition>,
  can: (scope: Parameters<ReturnType<typeof usePermission>["can"]>[0]) => boolean,
): Record<CommandSection, CommandDefinition[]> {
  const groups = SECTION_ORDER.reduce(
    (acc, section) => ({ ...acc, [section]: [] as CommandDefinition[] }),
    {} as Record<CommandSection, CommandDefinition[]>,
  );
  for (const cmd of commands) {
    if (cmd.requires && !can(cmd.requires)) continue;
    groups[cmd.section] = [...groups[cmd.section], cmd];
  }
  return groups;
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-neutral-7 bg-neutral-1 px-1.5 font-mono text-[11px] font-medium text-neutral-12 shadow-[0_1px_0_hsl(var(--border))] dark:bg-black/40 dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      {children}
    </kbd>
  );
}

export default function ShortcutsPage() {
  const t = useTranslations("commandPalette");
  const { can } = usePermission();

  const grouped = useMemo(() => groupVisible(COMMANDS, can), [can]);

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-base font-semibold text-neutral-12">Keyboard shortcuts</h1>
        <p className="mt-1 text-sm text-neutral-11">
          Press{" "}
          <kbd className="rounded border border-neutral-7 bg-neutral-1 px-1.5 py-0.5 font-mono text-[10px] dark:bg-black/40">
            ⌘K
          </kbd>{" "}
          anywhere to run any command. Use{" "}
          <kbd className="rounded border border-neutral-7 bg-neutral-1 px-1.5 py-0.5 font-mono text-[10px] dark:bg-black/40">
            ↑
          </kbd>
          /
          <kbd className="rounded border border-neutral-7 bg-neutral-1 px-1.5 py-0.5 font-mono text-[10px] dark:bg-black/40">
            ↓
          </kbd>{" "}
          to navigate the list.
        </p>
      </header>

      {/* Global shortcuts */}

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-10">
          Global
        </h2>
        <Table
          bare
          wrapperClassName="overflow-hidden rounded-[var(--radius-xl)] border border-neutral-7"
          wrapperStyle={SHORTCUT_DENSITY}
        >
          <Table.Body bordered>
            {GLOBAL_SHORTCUTS.map((row) => (
              <Table.Row key={row.label} className="bg-neutral-1">
                <Table.Cell className="align-top">
                  <div className="flex items-center gap-1">
                    {row.keys.map((k, i) => (
                      <span
                        key={`${row.label}-${k}-${i}`}
                        className="inline-flex items-center gap-1"
                      >
                        <KeyCap>{k}</KeyCap>
                        {i < row.keys.length - 1 && (
                          <span className="text-[10px] text-neutral-9">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell alignment="start" className="align-top">
                  <p className="font-medium text-neutral-12">{row.label}</p>
                  <p className="mt-0.5 text-xs text-neutral-10">{row.description}</p>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {/* Command palette commands */}
      <div className="space-y-6">
        {SECTION_ORDER.map((section) => {
          const items = grouped[section];
          if (items.length === 0) return null;
          return (
            <div key={section}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-10">
                {t(`sections.${section}`)}
              </h2>
              <Table
                bare
                wrapperClassName="overflow-hidden rounded-[var(--radius-xl)] border border-neutral-7"
                wrapperStyle={SHORTCUT_DENSITY}
              >
                <Table.Body bordered>
                  {items.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <Table.Row key={cmd.id} className="bg-neutral-1">
                        <Table.Cell className="w-12">
                          <Icon className="h-4 w-4 text-neutral-11" aria-hidden />
                        </Table.Cell>
                        <Table.Cell alignment="start">
                          <p className="font-medium text-neutral-12">
                            {t(`commands.${cmd.titleKey}`)}
                          </p>
                          {cmd.tags && cmd.tags.length > 0 && (
                            <p className="mt-0.5 text-xs text-neutral-10">{cmd.tags.join(" · ")}</p>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {cmd.shortcut ? (
                            <div className="inline-flex items-center gap-1">
                              {cmd.shortcut.map((k, i) => (
                                <KeyCap key={`${cmd.id}-${k}-${i}`}>{k}</KeyCap>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-10">via ⌘K</span>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          );
        })}
      </div>
    </section>
  );
}
