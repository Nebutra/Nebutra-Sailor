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
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { StartupConnectorsMenu } from "./startup-connectors-menu";

/**
 * What one sentence compiles into. `Governed runs` is the differentiator — it is
 * what makes Startup OS a *governed company* compiler, not just an app builder.
 */
const COMPILE_OUTPUTS = [
  {
    icon: BookClosed,
    key: "companyContext",
    highlight: false,
  },
  {
    icon: Sparkles,
    key: "launchArtifacts",
    highlight: false,
  },
  {
    icon: FolderClosed,
    key: "liveFiles",
    highlight: false,
  },
  {
    icon: Layers,
    key: "spatialCanvas",
    highlight: false,
  },
  {
    icon: ShieldCheck,
    key: "governedRuns",
    highlight: true,
  },
] as const;

/** Arena → catalog key; labels and example theses live under `arenas.<key>` in the catalog. */
const ARENA_KEYS: Record<StartupArena, string> = {
  "Developer infrastructure": "devInfra",
  "AI SaaS": "aiSaas",
  "Consumer product": "consumer",
  "B2B operations": "b2bOps",
  "Creative tooling": "creative",
};

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
  const tc = useTranslations("copy.startupOsStartupBuilderHome");
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
    <div className="h-full min-h-0">
      <section className="relative isolate flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-card text-neutral-12">
        {/* Light from above: a faint House-blue wash and a hairline horizon,
            the canvas the composer sits under — not an ink cloud. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, hsl(var(--ring) / 0.09), transparent 72%)",
          }}
        />
        {/* my-auto, not justify-center: centred when it fits, scrolls from the
            top when it does not (justify-center cut the heading off on phones). */}
        <div className="relative mx-auto my-auto flex w-full max-w-4xl flex-col px-5 py-16 sm:px-8">
          <div className="mx-auto w-full max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-neutral-11 shadow-xs backdrop-blur">
              <Lightning className="size-3.5 text-ring" aria-hidden="true" />
              {tc("startupAgentOS")}
            </span>
            <h2 className="mt-6 text-balance text-4xl tracking-tight text-neutral-12 sm:text-6xl">
              {tc("whatAreWeBuilding")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-11">
              {tc("oneSentenceCompilesInto")}
            </p>

            {/* The composer: one lit card — hairline, lit top edge, one ambient step. */}
            <div className="mx-auto mt-8 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-glass-md transition-[border-color] duration-flow focus-within:border-ring/50">
              {/* Chromeless native textarea: the @nebutra/ui Textarea primitive is a
 bordered "field" (own border/shadow + inline radius) that leaves a
 seam inside this unified box. data-allow-native is the sanctioned
 opt-out for a genuinely seamless prompt surface (same as the file
 input below). */}
              <textarea
                data-allow-native
                aria-label={tc("startupProposition")}
                value={thesis}
                onChange={(event) => onThesisChange(event.target.value)}
                disabled={disabled || isLoading}
                placeholder={tc("describeTheStartupProposition")}
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
                    aria-label={tc("attachAFile")}
                    title={tc("attachATextFile")}
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                  </Button>
                  <Select
                    value={arena}
                    onValueChange={(value) => onArenaChange(value as StartupArena)}
                    disabled={disabled || isLoading}
                  >
                    <SelectTrigger
                      aria-label={tc("startupArena")}
                      className="h-auto w-fit rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-neutral-11 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <SelectValue>{tc(`arenas.${ARENA_KEYS[arena]}.label`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STARTUP_ARENAS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {tc(`arenas.${ARENA_KEYS[option]}.label`)}
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
                  aria-label={isSaving ? tc("building") : tc("build")}
                  title={isSaving ? tc("building") : tc("build")}
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {thesis.trim().length === 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-neutral-10">{tc("try")}</span>
                {(tc.raw(`arenas.${ARENA_KEYS[arena]}.theses`) as string[]).map((example) => (
                  <Button
                    key={example}
                    type="button"
                    variant="outline"
                    shape="pill"
                    size="sm"
                    disabled={disabled || isLoading}
                    onClick={() => onThesisChange(example)}
                    className="bg-card/70 text-neutral-11"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            ) : null}

            {/* What one sentence compiles into: one hairline strip, not five tinted tiles. */}
            <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border text-left shadow-xs sm:grid-cols-2 lg:grid-cols-5 [&>*]:bg-card">
              {COMPILE_OUTPUTS.map((output) => {
                const OutputIcon = output.icon;
                return (
                  <div key={output.key} className="flex h-full flex-col gap-1.5 p-4">
                    <span className="inline-flex size-7 items-center justify-center rounded-[var(--radius-md)] border border-border bg-neutral-2">
                      <OutputIcon
                        className={`size-3.5 ${output.highlight ? "text-ring" : "text-neutral-11"}`}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 text-sm font-semibold text-neutral-12">
                      {tc(`outputs.${output.key}.title`)}
                    </span>
                    <span className="text-xs leading-5 text-neutral-11">
                      {tc(`outputs.${output.key}.description`)}
                    </span>
                  </div>
                );
              })}
            </div>

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
    </div>
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
  const tc = useTranslations("copy.startupOsStartupBuilderHome");
  if (isLoading) {
    return (
      <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
        {["one", "two"].map((key) => (
          <Skeleton key={key} rounded height={64} aria-label={tc("loadingRecentProjects")} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
      {projects.slice(0, 4).map((project) => (
        <Button
          key={project.id}
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onProjectSelect(project)}
          className={`h-auto w-full flex-col items-start gap-1 rounded-xl border p-3 text-left shadow-xs ${
            project.id === selectedProjectId
              ? "border-ring/50 bg-card text-neutral-12"
              : "border-border bg-card text-neutral-11 hover:bg-accent"
          }`}
        >
          <span className="block w-full truncate text-sm font-semibold">
            {companyName(project.companyContext)}
          </span>
          <span className="block w-full truncate text-xs font-normal opacity-80">
            {project.arena} / {project.status}
          </span>
        </Button>
      ))}
    </div>
  );
}
