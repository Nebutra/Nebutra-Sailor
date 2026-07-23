"use client";

import { Envelope as Mail } from "@nebutra/icons";
import { groupTemplatesByCategory, type TemplateMeta } from "@/lib/template-types";

interface SidebarProps {
  templates: readonly TemplateMeta[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ templates, selectedId, onSelect }: SidebarProps) {
  const groups = groupTemplatesByCategory(templates);

  return (
    <aside
      className="flex h-full w-72 flex-col border-r border-border bg-muted"
      aria-label="Email template navigation"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md text-white"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-sm font-semibold text-foreground">Mail Preview</h1>
          <p className="text-xs text-muted-foreground">@nebutra/email</p>
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Templates">
        {groups.map((group) => (
          <div key={group.category} className="mb-4">
            <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.category}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((tpl) => {
                const active = tpl.id === selectedId;
                return (
                  <li key={tpl.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(tpl.id)}
                      className={[
                        "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-offset-1",
                        active
                          ? "bg-[var(--blue-3)] text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="block truncate">{tpl.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {tpl.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <footer className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        {templates.length} template{templates.length === 1 ? "" : "s"}
      </footer>
    </aside>
  );
}
