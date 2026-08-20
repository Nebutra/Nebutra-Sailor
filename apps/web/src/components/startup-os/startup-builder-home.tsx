"use client";

/**
 * Startup OS entry surface — "What are we building?".
 *
 * One focal prompt on a quiet page: an ambient brand wash, an elevated prompt
 * card (elevation instead of a stroke), the five things one sentence compiles
 * into, and the tenant's real recent projects. Regions are separated by
 * whitespace and a one-step tonal shift (`neutral-1` page / `neutral-2` cards),
 * never by borders.
 */

import {
  ArrowRight,
  BookClosed,
  FolderClosed,
  Layers,
  Lightning,
  Paperclip,
  ShieldCheck,
  Sparkles,
} from "@nebutra/icons";
import { companyName } from "@nebutra/startup-os/company-context/projection";
import {
  STARTUP_ARENAS,
  type StartupArena,
  type StartupOSProject,
} from "@nebutra/startup-os/compiler";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@nebutra/ui/primitives";
import { useRef } from "react";
import { StartupConnectorsMenu } from "./startup-connectors-menu";

/**
 * What one sentence compiles into. `Governed runs` is the differentiator — it is
 * what makes Startup OS a *governed company* compiler, not just an app builder.
 */
const COMPILE_OUTPUTS = [
  {
    icon: BookClosed,
    title: "CompanyContext",
    desc: "Mission, ICP, and positioning — the company's source of truth.",
    highlight: false,
  },
  {
    icon: Sparkles,
    title: "Launch artifacts",
    desc: "Brand, landing page, and pitch, generated together.",
    highlight: false,
  },
  {
    icon: FolderClosed,
    title: "Live files",
    desc: "A real, runnable app scaffold you can edit.",
    highlight: false,
  },
  {
    icon: Layers,
    title: "Spatial canvas",
    desc: "Every artifact mapped on one zoomable canvas.",
    highlight: false,
  },
  {
    icon: ShieldCheck,
    title: "Governed runs",
    desc: "Every agent run is approval-gated and audited.",
    highlight: true,
  },
] as const;

/** Arena-specific example theses — clickable starters that defeat the blank page. */
const EXAMPLE_THESES: Record<StartupArena, readonly string[]> = {
  "Developer infrastructure": [
    "A usage-metered API gateway for AI apps",
    "A self-host vector database with one-click cloud",
  ],
  "AI SaaS": [
    "An AI meeting-notes tool that drafts the follow-up email",
    "A support-deflection copilot for B2B SaaS",
  ],
  "Consumer product": [
    "A habit tracker that rewards streaks with friends",
    "A local-first journal with weekly AI reflection",
  ],
  "B2B operations": [
    "An approvals + audit workspace for finance teams",
    "A vendor-onboarding portal with compliance checks",
  ],
  "Creative tooling": [
    "A storyboard-to-video generator for marketers",
    "A brand-kit generator from a single logo",
  ],
};

/** Elevation stands in for the stroke this card deliberately does not have. */
const PROMPT_CARD_SHADOW = {
  boxShadow: "0 4px 24px -4px color-mix(in srgb, var(--neutral-12) 6%, transparent)",
} as const;

export interface StartupBuilderHomeProps {
  readonly arena: StartupArena;
  readonly canCompile: boolean;
  readonly disabled: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly onArenaChange: (arena: StartupArena) => void;
  readonly onCompile: () => void;
  readonly onProjectSelect: (project: StartupOSProject) => void;
  readonly projects: readonly StartupOSProject[];
  readonly selectedProjectId: string | null;
  readonly thesis: string;
  readonly onThesisChange: (value: string) => void;
}

export function StartupBuilderHome({
  arena,
  canCompile,
  disabled,
  isLoading,
  isSaving,
  onArenaChange,
  onCompile,
  onProjectSelect,
  projects,
  selectedProjectId,
  thesis,
  onThesisChange,
}: StartupBuilderHomeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real local-file attach: fold a text file's content into the proposition so it
  // actually feeds the compiler. No cloud-source mocks — Drive/Figma/etc. need
  // real integrations, not dead menu items.
  const handleAttachFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const parts: string[] = [];
    for (const file of Array.from(fileList)) {
      const text = (await file.text()).trim();
      if (text) parts.push(`\n\n--- Attached: ${file.name} ---\n${text}`);
    }
    if (parts.length > 0) onThesisChange(`${thesis}${parts.join("")}`.trimStart());
  };

  return (
    <AnimateIn preset="emerge" className="h-full min-h-0">
      <section className="relative flex h-full min-h-0 flex-col justify-center overflow-y-auto overflow-x-hidden bg-neutral-1 text-neutral-12">
        {/* Ambient brand wash — subtle (governed/enterprise), not a loud aurora. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[380px] w-full max-w-3xl opacity-10 blur-3xl"
          style={{ background: "hsl(var(--primary))" }}
        />
        <div className="relative mx-auto flex w-full max-w-4xl flex-col px-5 py-16 sm:px-8">
          <div className="mx-auto w-full max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-2 px-3 py-1.5 text-xs font-semibold text-neutral-11">
              <Lightning className="size-3.5 text-primary" aria-hidden="true" />
              Startup Agent OS
            </span>
            <h2
              className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl"
              style={{
                background: "hsl(var(--primary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              What are we building?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-11">
              One sentence compiles into a whole governed company — context, launch artifacts, live
              files, spatial canvas, and approval-gated runs.
            </p>

            <div
              className="mx-auto mt-8 overflow-hidden rounded-3xl bg-neutral-2 text-left"
              style={PROMPT_CARD_SHADOW}
            >
              {/* Chromeless native textarea: the @nebutra/ui Textarea primitive is a
 bordered "field" (own border/shadow + inline radius) that leaves a
 seam inside this unified box. data-allow-native is the sanctioned
 opt-out for a genuinely seamless prompt surface (same as the file
 input below). */}
              <textarea
                data-allow-native
                aria-label="Startup proposition"
                value={thesis}
                onChange={(event) => onThesisChange(event.target.value)}
                disabled={disabled || isLoading}
                placeholder="Describe the startup proposition to compile into a tenant-scoped company workspace..."
                className="block min-h-[150px] w-full resize-none border-0 bg-transparent p-5 text-lg leading-7 text-neutral-12 outline-none placeholder:text-neutral-10 disabled:cursor-not-allowed disabled:opacity-60 sm:p-6"
              />
              <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    data-allow-native
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.markdown,.json,.csv,.yaml,.yml,text/*"
                    className="sr-only"
                    onChange={(event) => {
                      void handleAttachFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    shape="circle"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isLoading}
                    aria-label="Attach a file"
                    title="Attach a text file to fold into the proposition"
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                  </Button>
                  <Select
                    value={arena}
                    onValueChange={(value) => onArenaChange(value as StartupArena)}
                    disabled={disabled || isLoading}
                  >
                    <SelectTrigger
                      aria-label="Startup arena"
                      className="h-auto w-fit rounded-full bg-neutral-1 px-3.5 py-2 text-xs font-semibold text-neutral-11 shadow-none transition-colors hover:bg-neutral-3 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STARTUP_ARENAS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <StartupConnectorsMenu disabled={disabled || isLoading} />
                </div>
                <Button
                  type="button"
                  variant="ink"
                  shape="circle"
                  disabled={!canCompile}
                  onClick={onCompile}
                  aria-label={isSaving ? "Building" : "Build"}
                  title={isSaving ? "Building…" : "Build"}
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {thesis.trim().length === 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-neutral-10">Try</span>
                {EXAMPLE_THESES[arena].map((example) => (
                  <Button
                    key={example}
                    type="button"
                    variant="outline"
                    shape="pill"
                    size="sm"
                    disabled={disabled || isLoading}
                    onClick={() => onThesisChange(example)}
                    className="hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            ) : null}

            <AnimateInGroup
              stagger="normal"
              className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-3 lg:grid-cols-5"
            >
              {COMPILE_OUTPUTS.map((output) => {
                const OutputIcon = output.icon;
                return (
                  <AnimateIn key={output.title} preset="fadeUp">
                    <div
                      className={`flex h-full flex-col gap-2 rounded-2xl p-3.5 ${
                        output.highlight ? "bg-primary/10 dark:bg-primary/15" : "bg-neutral-2"
                      }`}
                    >
                      <OutputIcon
                        className={`size-4 ${output.highlight ? "text-primary" : "text-neutral-10"}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-neutral-12">{output.title}</span>
                      <span className="text-xs leading-5 text-neutral-11">{output.desc}</span>
                    </div>
                  </AnimateIn>
                );
              })}
            </AnimateInGroup>

            <StartupRecentProjects
              disabled={disabled}
              isLoading={isLoading}
              onProjectSelect={onProjectSelect}
              projects={projects}
              selectedProjectId={selectedProjectId}
            />
          </div>
        </div>
      </section>
    </AnimateIn>
  );
}

/**
 * The tenant's real recent projects. While the list is in flight it holds the
 * same geometry with skeletons so the hero never jumps when data lands; with no
 * projects at all it renders nothing — the prompt above is the empty state.
 */
function StartupRecentProjects({
  disabled,
  isLoading,
  onProjectSelect,
  projects,
  selectedProjectId,
}: {
  disabled: boolean;
  isLoading: boolean;
  onProjectSelect: (project: StartupOSProject) => void;
  projects: readonly StartupOSProject[];
  selectedProjectId: string | null;
}) {
  if (isLoading) {
    return (
      <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
        {["one", "two"].map((key) => (
          <Skeleton key={key} rounded height={64} aria-label="Loading recent projects" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <AnimateInGroup stagger="fast" className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
      {projects.slice(0, 4).map((project) => (
        <AnimateIn key={project.id} preset="fadeUp">
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => onProjectSelect(project)}
            className={`h-auto w-full flex-col items-start gap-1 rounded-2xl p-3 text-left ${
              project.id === selectedProjectId
                ? "bg-primary/10 text-primary dark:bg-primary/15"
                : "bg-neutral-2 text-neutral-11 hover:bg-neutral-3"
            }`}
          >
            <span className="block w-full truncate text-sm font-semibold">
              {companyName(project.companyContext)}
            </span>
            <span className="block w-full truncate text-[11px] font-normal opacity-80">
              {project.arena} / {project.status}
            </span>
          </Button>
        </AnimateIn>
      ))}
    </AnimateInGroup>
  );
}
