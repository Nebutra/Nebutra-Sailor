"use client";

import { BadgeCheck, MoreHorizontal, Plus, Search, Settings2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * TEMPLATE — Skills marketplace grid.
 *
 * Currently not wired to live data. The `Skill` + `UserSkill` Prisma models
 * exist. Activation path:
 *   1. GET /api/skills (list catalogue, joined with current user's UserSkill)
 *   2. PATCH /api/skills/:id/installation { enabled }
 *   3. Wire `<SkillsGrid skills={data} onToggle={mutate}>` in /settings/skills
 *   4. Read enabled skills in /api/chat to extend tools/system prompt
 *
 * Seeded skills go into `@nebutra/db` seed script. Custom skills can also be
 * authored — surface an "Add custom skill" entry that opens a wizard.
 */

export type SkillCategory =
  | "automation"
  | "analytics"
  | "communication"
  | "creative"
  | "developer"
  | "research";

export interface SkillRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: SkillCategory | null;
  isOfficial: boolean;
  version: string;
  iconUrl?: string;
  tags?: string[];
  /** When undefined, skill is not installed for the current user. */
  installation?: { enabled: boolean; installedAt: string };
}

interface Props {
  skills: SkillRow[];
  /** Called when user toggles a skill. Templates default to a no-op. */
  onToggle?: (skill: SkillRow, enabled: boolean) => Promise<void> | void;
  /** Called when user clicks "Add custom skill". */
  onAddCustom?: () => void;
}

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  automation: "Automation",
  analytics: "Analytics",
  communication: "Communication",
  creative: "Creative",
  developer: "Developer",
  research: "Research",
};

export function SkillsGrid({ skills, onToggle, onAddCustom }: Props) {
  const [query, setQuery] = useState("");
  const [officialOnly, setOfficialOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((skill) => {
      if (officialOnly && !skill.isOfficial) return false;
      if (!q) return true;
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.slug.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [skills, query, officialOnly]);

  async function handleToggle(skill: SkillRow, next: boolean) {
    if (!onToggle) return;
    setBusyId(skill.id);
    try {
      await onToggle(skill, next);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-10 dark:text-white/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="w-full rounded-lg border border-neutral-7 bg-neutral-1 py-1.5 pl-8 pr-3 text-sm text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-7 bg-neutral-1 px-3 py-1.5 text-xs font-medium text-neutral-11 dark:border-white/15 dark:bg-black/40 dark:text-white/70">
          <BadgeCheck
            className={`h-3.5 w-3.5 ${officialOnly ? "text-blue-9" : "text-neutral-10 dark:text-white/40"}`}
          />
          Official only
          <input
            type="checkbox"
            checked={officialOnly}
            onChange={(e) => setOfficialOnly(e.target.checked)}
            className="ml-1 h-3 w-3 rounded border-neutral-7 text-blue-9 dark:border-white/30 dark:bg-black/40"
          />
        </label>
      </div>

      {/* Add custom skill — full-width card */}
      {onAddCustom && (
        <button
          type="button"
          onClick={onAddCustom}
          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-neutral-7 bg-neutral-1 p-4 text-left transition-colors hover:border-neutral-9 hover:bg-neutral-2 dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-12 dark:text-white">
                Add a custom skill
              </p>
              <p className="text-xs text-neutral-10 dark:text-white/50">
                Author your own capability with markdown + JSON schema.
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-blue-11 group-hover:text-blue-12 dark:text-blue-9 dark:group-hover:text-blue-8">
            Get started →
          </span>
        </button>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-7 bg-neutral-1 px-6 py-10 text-center dark:border-white/15 dark:bg-white/[0.02]">
          <Sparkles className="mx-auto h-6 w-6 text-neutral-9 dark:text-white/30" />
          <p className="mt-3 text-sm font-medium text-neutral-12 dark:text-white">
            No skills match
          </p>
          <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
            Try a different search or clear the Official-only filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => {
            const enabled = !!skill.installation?.enabled;
            const isBusy = busyId === skill.id;
            return (
              <article
                key={skill.id}
                className={`flex h-full flex-col rounded-xl border p-4 transition-colors ${
                  enabled
                    ? "border-blue-6 bg-blue-2/30 dark:border-blue-7/50 dark:bg-blue-2/10"
                    : "border-neutral-6 bg-neutral-1 dark:border-white/10 dark:bg-white/[0.02]"
                } ${isBusy ? "opacity-60" : ""}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-sm font-semibold text-neutral-12 dark:text-white">
                      {skill.slug}
                    </h3>
                    {skill.isOfficial && (
                      <BadgeCheck
                        className="h-3.5 w-3.5 shrink-0 text-blue-9"
                        aria-label="Official"
                      />
                    )}
                  </div>
                  <Toggle
                    checked={enabled}
                    onChange={(next) => handleToggle(skill, next)}
                    disabled={isBusy || !onToggle}
                    label={`Toggle ${skill.name}`}
                  />
                </div>

                <p className="line-clamp-3 text-xs leading-relaxed text-neutral-10 dark:text-white/50">
                  {skill.description}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {skill.category && (
                      <span className="rounded-full bg-neutral-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-11 dark:bg-white/10 dark:text-white/60">
                        {CATEGORY_LABELS[skill.category]}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-neutral-10 dark:text-white/40">
                      v{skill.version}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`${skill.name} actions`}
                    className="rounded-md p-1 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}

function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-8 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-9" : "bg-neutral-6 dark:bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// Sub-component icon export for downstream wizard / detail views.
export { Settings2 as SkillSettingsIcon };
