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

const GLOBAL_SHORTCUTS: Array<{ keys: string[]; id: string }> = [
  {
    keys: ["⌘", "K"],
    id: "commandPalette",
  },
  {
    keys: ["⌘", "B"],
    id: "toggleSidebar",
  },
  {
    keys: ["Esc"],
    id: "closeOverlay",
  },
  {
    keys: ["Enter"],
    id: "submit",
  },
  {
    keys: ["⇧", "Enter"],
    id: "newline",
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
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-neutral-7 bg-neutral-1 px-1.5 font-mono text-xs font-medium text-neutral-12 shadow-[0_1px_0_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

export default function ShortcutsPage() {
  const tc = useTranslations("copy.shortcutsPage");
  const t = useTranslations("commandPalette");
  const { can } = usePermission();

  const grouped = useMemo(() => groupVisible(COMMANDS, can), [can]);

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-base font-semibold text-neutral-12">{tc("keyboardShortcuts")}</h1>
        <p className="mt-1 text-sm text-neutral-11">
          {tc.rich("intro", {
            kbd: (chunks) => (
              <kbd className="rounded border border-neutral-7 bg-neutral-1 px-1.5 py-0.5 font-mono text-xs">
                {chunks}
              </kbd>
            ),
          })}
        </p>
      </header>

      {/* Global shortcuts */}

      <div>
        <h2 className="mb-3 text-xs font-semibold text-neutral-10">{tc("global")}</h2>
        <Table
          bare
          wrapperClassName="overflow-hidden rounded-xl border border-border"
          wrapperStyle={SHORTCUT_DENSITY}
        >
          <Table.Body bordered>
            {GLOBAL_SHORTCUTS.map((row) => (
              <Table.Row key={row.id} className="bg-neutral-1">
                <Table.Cell className="align-top">
                  <div className="flex items-center gap-1">
                    {row.keys.map((k, i) => (
                      <span key={`${row.id}-${k}-${i}`} className="inline-flex items-center gap-1">
                        <KeyCap>{k}</KeyCap>
                        {i < row.keys.length - 1 && (
                          <span className="text-xs text-neutral-9">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell alignment="start" className="align-top">
                  <p className="font-medium text-neutral-12">{tc(`global.${row.id}.label`)}</p>
                  <p className="mt-0.5 text-xs text-neutral-10">
                    {tc(`global.${row.id}.description`)}
                  </p>
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
              <h2 className="mb-3 text-xs font-semibold text-neutral-10">
                {t(`sections.${section}`)}
              </h2>
              <Table
                bare
                wrapperClassName="overflow-hidden rounded-xl border border-border"
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
                        </Table.Cell>
                        <Table.Cell>
                          {cmd.shortcut ? (
                            <div className="inline-flex items-center gap-1">
                              {cmd.shortcut.map((k, i) => (
                                <KeyCap key={`${cmd.id}-${k}-${i}`}>{k}</KeyCap>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-10">{tc("viaK")}</span>
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
