"use client";

/**
 * Dockerfile starter — configure-then-generate (brief §8).
 *
 * The options *are* the product: every select and toggle regenerates the file,
 * so there is no Generate button gating the structured path (that is the step
 * tax EaseCloud and GitLoop both charge). Free-text overrides commit on blur,
 * not on keystroke, so a half-typed command never flashes broken output
 * (brief §9.1 step 5). Layout, idle/running/error states, copy and download all
 * belong to the shell.
 */

import { Checkbox, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  ConfigureGenerateShell,
  type ShellArtifact,
  ShellArtifacts,
  ShellBadge,
  ShellVerdict,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-select";

type Language = "node" | "python" | "go" | "java" | "ruby" | "rust";

interface Output {
  dockerfile: string;
  dockerignore: string | null;
  dockerCompose: string | null;
  warnings: string[];
  meta: {
    language: string;
    framework: string;
    packageManager: string;
    baseVariant: string;
    languageVersion: string;
    listenPort: number;
    stages: number;
    nonRootUser: boolean;
    multiStage: boolean;
  };
}

/** Mirrors the engine's scoping so an impossible pair is never offered. */
const FRAMEWORKS: Record<Language, readonly string[]> = {
  node: ["none", "express", "next", "nest", "vite"],
  python: ["none", "django", "fastapi", "flask"],
  go: ["none"],
  java: ["none", "spring-boot"],
  ruby: ["none", "rails", "sinatra"],
  rust: ["none"],
};

const PACKAGE_MANAGERS: Record<Language, readonly string[]> = {
  node: ["auto", "npm", "pnpm", "yarn", "bun"],
  python: ["auto", "pip", "poetry", "uv"],
  go: ["auto"],
  java: ["auto", "maven", "gradle"],
  ruby: ["auto"],
  rust: ["auto"],
};

const LANGUAGE_LABEL: Record<Language, string> = {
  node: "Node.js",
  python: "Python",
  go: "Go",
  java: "Java",
  ruby: "Ruby",
  rust: "Rust",
};

const FRAMEWORK_LABEL: Record<string, string> = {
  express: "Express",
  next: "Next.js",
  nest: "NestJS",
  vite: "Vite (static)",
  django: "Django",
  fastapi: "FastAPI",
  flask: "Flask",
  "spring-boot": "Spring Boot",
  rails: "Rails",
  sinatra: "Sinatra",
};

const PM_LABEL: Record<string, string> = {
  npm: "npm",
  pnpm: "pnpm",
  yarn: "Yarn",
  bun: "Bun",
  pip: "pip",
  poetry: "Poetry",
  uv: "uv",
  maven: "Maven",
  gradle: "Gradle",
};

interface TextFields {
  version: string;
  workdir: string;
  port: string;
  buildCommand: string;
  startCommand: string;
}

const EMPTY_TEXT: TextFields = {
  version: "",
  workdir: "",
  port: "",
  buildCommand: "",
  startCommand: "",
};

export function W3DockerfileStarterRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");

  const [language, setLanguage] = useState<Language>("node");
  const [framework, setFramework] = useState("none");
  const [packageManager, setPackageManager] = useState("auto");
  const [baseVariant, setBaseVariant] = useState("slim");
  const [multiStage, setMultiStage] = useState(true);
  const [nonRootUser, setNonRootUser] = useState(true);
  const [includeDockerignore, setIncludeDockerignore] = useState(true);
  const [includeCompose, setIncludeCompose] = useState(false);
  const [includeHealthcheck, setIncludeHealthcheck] = useState(false);

  // Draft is what the user is typing; committed is what the engine has seen.
  const [draft, setDraft] = useState<TextFields>(EMPTY_TEXT);
  const [committed, setCommitted] = useState<TextFields>(EMPTY_TEXT);

  const changeLanguage = (next: string) => {
    const lang = next as Language;
    setLanguage(lang);
    // Framework, package manager and every per-framework default belong to the
    // old language — carrying them over would produce a rejected combination.
    setFramework("none");
    setPackageManager("auto");
    setDraft(EMPTY_TEXT);
    setCommitted(EMPTY_TEXT);
  };

  const changeFramework = (next: string) => {
    setFramework(next);
    setDraft((d) => ({ ...d, port: "", buildCommand: "", startCommand: "" }));
    setCommitted((c) => ({ ...c, port: "", buildCommand: "", startCommand: "" }));
  };

  const commit = () => setCommitted(draft);
  const setField = (key: keyof TextFields) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const port = /^\d{1,5}$/.test(committed.port) ? Number(committed.port) : undefined;

  const input: Record<string, unknown> = {
    language,
    framework,
    packageManager,
    baseVariant,
    multiStage,
    nonRootUser,
    includeDockerignore,
    includeCompose,
    includeHealthcheck,
    ...(committed.version ? { languageVersion: committed.version } : {}),
    ...(committed.workdir ? { workdir: committed.workdir } : {}),
    ...(port !== undefined ? { port } : {}),
    ...(committed.buildCommand ? { buildCommand: committed.buildCommand } : {}),
    ...(committed.startCommand ? { startCommand: committed.startCommand } : {}),
  };

  const frameworkOptions = FRAMEWORKS[language].map((id) => ({
    value: id,
    label: id === "none" ? t("dockerfileStarter.frameworkNone") : (FRAMEWORK_LABEL[id] ?? id),
  }));

  const pmOptions = PACKAGE_MANAGERS[language].map((id) => ({
    value: id,
    label: id === "auto" ? t("dockerfileStarter.pmAuto") : (PM_LABEL[id] ?? id),
  }));

  const toggles = [
    {
      id: "multiStage",
      label: t("dockerfileStarter.multiStage"),
      checked: multiStage,
      set: setMultiStage,
    },
    {
      id: "nonRootUser",
      label: t("dockerfileStarter.nonRootUser"),
      checked: nonRootUser,
      set: setNonRootUser,
    },
    {
      id: "includeDockerignore",
      label: t("dockerfileStarter.includeDockerignore"),
      checked: includeDockerignore,
      set: setIncludeDockerignore,
    },
    {
      id: "includeCompose",
      label: t("dockerfileStarter.includeCompose"),
      checked: includeCompose,
      set: setIncludeCompose,
    },
    {
      id: "includeHealthcheck",
      label: t("dockerfileStarter.includeHealthcheck"),
      checked: includeHealthcheck,
      set: setIncludeHealthcheck,
    },
  ];

  const textField = (
    key: keyof TextFields,
    label: string,
    placeholder: string,
    inputMode?: "numeric",
  ) => (
    <Input
      id={`dockerfile-${key}`}
      label={label}
      value={draft[key]}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => setField(key)(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className="font-mono"
      spellCheck={false}
      autoComplete="off"
    />
  );

  return (
    <ConfigureGenerateShell<Output>
      engine={{ toolId }}
      input={input}
      emptyHint={t("dockerfileStarter.emptyHint")}
      note={t("dockerfileStarter.note")}
      exit={(output) => ({ json: output })}
      renderResult={(output) => {
        const artifacts: ShellArtifact[] = [
          {
            id: "dockerfile",
            label: "Dockerfile",
            body: output.dockerfile,
            filename: "Dockerfile",
          },
        ];
        if (output.dockerignore) {
          artifacts.push({
            id: "dockerignore",
            label: ".dockerignore",
            body: output.dockerignore,
            filename: ".dockerignore",
          });
        }
        if (output.dockerCompose) {
          artifacts.push({
            id: "compose",
            label: "compose.yaml",
            body: output.dockerCompose,
            filename: "compose.yaml",
            mimeType: "application/yaml;charset=utf-8",
          });
        }
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <ShellBadge tone="info">
                {t("dockerfileStarter.stages", { n: output.meta.stages })}
              </ShellBadge>
              <ShellBadge tone={output.meta.nonRootUser ? "success" : "warning"}>
                {output.meta.nonRootUser
                  ? t("dockerfileStarter.badgeNonRoot")
                  : t("dockerfileStarter.badgeRoot")}
              </ShellBadge>
              <ShellBadge tone="neutral">
                {t("dockerfileStarter.badgePort", { port: output.meta.listenPort })}
              </ShellBadge>
              <ShellBadge tone="neutral">
                {`${output.meta.languageVersion} · ${output.meta.baseVariant}`}
              </ShellBadge>
            </div>
            {output.warnings.length > 0 ? (
              <ShellVerdict
                tone="warning"
                headline={t("dockerfileStarter.warnings", { n: output.warnings.length })}
                caveat={
                  <ul className="list-disc space-y-1 pl-4">
                    {output.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                }
              />
            ) : null}
            <ShellArtifacts artifacts={artifacts} />
          </div>
        );
      }}
    >
      <div className="space-y-3">
        <p className="text-xs font-medium text-[var(--neutral-11)]">
          {t("dockerfileStarter.groupWhat")}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <RunnerSelect
            id="dockerfile-language"
            label={t("dockerfileStarter.language")}
            value={language}
            onChange={changeLanguage}
            options={(Object.keys(LANGUAGE_LABEL) as Language[]).map((id) => ({
              value: id,
              label: LANGUAGE_LABEL[id],
            }))}
          />
          {/* Go and Rust have one shape each — a one-option select is dead UI. */}
          {frameworkOptions.length > 1 ? (
            <RunnerSelect
              id="dockerfile-framework"
              label={t("dockerfileStarter.framework")}
              value={framework}
              onChange={changeFramework}
              options={frameworkOptions}
            />
          ) : null}
          {pmOptions.length > 1 ? (
            <RunnerSelect
              id="dockerfile-pm"
              label={t("dockerfileStarter.packageManager")}
              value={packageManager}
              onChange={setPackageManager}
              options={pmOptions}
            />
          ) : null}
          <RunnerSelect
            id="dockerfile-variant"
            label={t("dockerfileStarter.baseVariant")}
            value={baseVariant}
            onChange={setBaseVariant}
            options={[
              { value: "slim", label: t("dockerfileStarter.variantSlim") },
              { value: "alpine", label: t("dockerfileStarter.variantAlpine") },
              { value: "full", label: t("dockerfileStarter.variantFull") },
            ]}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-[var(--neutral-11)]">
          {t("dockerfileStarter.groupHow")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {textField("version", t("dockerfileStarter.version"), "22")}
          {textField("workdir", t("dockerfileStarter.workdir"), "/app")}
          {textField("port", t("dockerfileStarter.port"), "3000", "numeric")}
          {textField(
            "buildCommand",
            t("dockerfileStarter.buildCommand"),
            t("dockerfileStarter.commandPlaceholder"),
          )}
          {textField(
            "startCommand",
            t("dockerfileStarter.startCommand"),
            t("dockerfileStarter.commandPlaceholder"),
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--neutral-11)]">
          {toggles.map((toggle) => (
            <Checkbox
              key={toggle.id}
              id={`dockerfile-${toggle.id}`}
              checked={toggle.checked}
              onChange={toggle.set}
            >
              {toggle.label}
            </Checkbox>
          ))}
        </div>
      </div>
    </ConfigureGenerateShell>
  );
}
