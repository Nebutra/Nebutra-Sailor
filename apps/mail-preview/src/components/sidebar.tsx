"use client";

import { Mail } from "lucide-react";
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
      className="flex h-full w-72 flex-col border-r border-[var(--neutral-6)] bg-[var(--neutral-2)]"
      aria-label="Email template navigation"
    >
      <header className="flex items-center gap-2 border-b border-[var(--neutral-6)] px-4 py-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-sm font-semibold text-[var(--neutral-12)]">Mail Preview</h1>
          <p className="text-xs text-[var(--neutral-10)]">@nebutra/email</p>
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Templates">
        {groups.map((group) => (
          <div key={group.category} className="mb-4">
            <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-10)]">
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
                        "focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1",
                        active
                          ? "bg-[var(--blue-3)] text-[var(--blue-11)] font-medium"
                          : "text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]",
                      ].join(" ")}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="block truncate">{tpl.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--neutral-10)]">
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

      <footer className="border-t border-[var(--neutral-6)] px-4 py-3 text-[11px] text-[var(--neutral-10)]">
        {templates.length} template{templates.length === 1 ? "" : "s"}
      </footer>
    </aside>
  );
}
