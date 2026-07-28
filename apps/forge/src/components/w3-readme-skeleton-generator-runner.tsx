"use client";

/**
 * README skeleton generator — configure-then-generate (brief §8).
 *
 * The section checklist *is* the product: every toggle and keystroke
 * regenerates the document, there is no "Generate" button (readme.so proves
 * live regeneration works for this job; MarkdownMe's button-gated form is the
 * cautionary case). Layout, idle/running/error states, copy and download all
 * come from ConfigureGenerateShell.
 */

import { Checkbox, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useMemo, useState } from "react";

import {
  ConfigureGenerateShell,
  ShellBadge,
  ShellCode,
  ShellDrill,
  ShellNote,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-select";

/** Same ids, same fixed order as the engine's `README_SECTIONS`. */
const SECTION_GROUPS = [
  { id: "core", sections: ["title", "badges", "callout", "toc", "installation", "usage"] },
  { id: "docs", sections: ["features", "api-reference", "screenshots", "roadmap"] },
  { id: "community", sections: ["contributing", "support", "acknowledgements"] },
  { id: "meta", sections: ["license", "authors", "tech-stack"] },
] as const;

const DEFAULT_SECTIONS = ["title", "installation", "usage", "license"];

const FENCE_LANGUAGES = ["bash", "sh", "powershell", "ts", "js", "py", "go", "rs", "json", "text"];
const CALLOUT_KINDS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
const SPDX_IDS = ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "ISC", "MPL-2.0", "Unlicense"];

interface ReadmeOutput {
  markdown: string;
  filename: string;
  sectionsIncluded: string[];
  sectionsOmitted: { section: string; reason: string }[];
  headings: { text: string; anchor: string }[];
  warnings: string[];
  chars: number;
}

function toList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function W3ReadmeSkeletonGeneratorRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();

  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [installCommand, setInstallCommand] = useState("");
  const [installLanguage, setInstallLanguage] = useState("bash");
  const [usageExample, setUsageExample] = useState("");
  const [usageLanguage, setUsageLanguage] = useState("bash");
  const [features, setFeatures] = useState("");
  const [license, setLicense] = useState("MIT");
  const [authors, setAuthors] = useState("");
  const [contact, setContact] = useState("");
  const [npmPackage, setNpmPackage] = useState("");
  const [repo, setRepo] = useState("");
  const [badgeNpm, setBadgeNpm] = useState(false);
  const [badgeBuild, setBadgeBuild] = useState(false);
  const [badgeLicense, setBadgeLicense] = useState(true);
  const [techStack, setTechStack] = useState("");
  const [calloutKind, setCalloutKind] = useState("NOTE");
  const [calloutBody, setCalloutBody] = useState("");

  const on = (id: string) => sections.includes(id);
  const toggle = (id: string, next: boolean) =>
    setSections((prev) => (next ? [...prev, id] : prev.filter((s) => s !== id)));

  const input = useMemo(() => {
    if (sections.length === 0) return null;
    return {
      sections,
      projectName,
      description,
      installCommand,
      installLanguage,
      usageExample,
      usageLanguage,
      features: toList(features),
      license,
      authors: toList(authors),
      contact,
      npmPackage,
      repo,
      badges: { npmVersion: badgeNpm, buildStatus: badgeBuild, license: badgeLicense },
      techStack: toList(techStack),
      calloutKind,
      calloutBody,
    };
  }, [
    sections,
    projectName,
    description,
    installCommand,
    installLanguage,
    usageExample,
    usageLanguage,
    features,
    license,
    authors,
    contact,
    npmPackage,
    repo,
    badgeNpm,
    badgeBuild,
    badgeLicense,
    techStack,
    calloutKind,
    calloutBody,
  ]);

  const detail = (id: string): ReactNode => {
    if (!on(id)) return null;
    switch (id) {
      case "title":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label={t("readmeSkeleton.projectName")}
              placeholder={t("readmeSkeleton.projectNamePlaceholder")}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <Input
              aria-label={t("readmeSkeleton.description")}
              placeholder={t("readmeSkeleton.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        );
      case "badges":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4">
              <Checkbox checked={badgeLicense} onChange={setBadgeLicense}>
                {t("readmeSkeleton.badgeLicense")}
              </Checkbox>
              <Checkbox checked={badgeNpm} onChange={setBadgeNpm}>
                {t("readmeSkeleton.badgeNpm")}
              </Checkbox>
              <Checkbox checked={badgeBuild} onChange={setBadgeBuild}>
                {t("readmeSkeleton.badgeBuild")}
              </Checkbox>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label={t("readmeSkeleton.npmPackage")}
                placeholder={t("readmeSkeleton.npmPackagePlaceholder")}
                value={npmPackage}
                onChange={(e) => setNpmPackage(e.target.value)}
              />
              <Input
                aria-label={t("readmeSkeleton.repo")}
                placeholder={t("readmeSkeleton.repoPlaceholder")}
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
              />
            </div>
          </div>
        );
      case "callout":
        return (
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <RunnerSelect
              id={`${uid}-callout-kind`}
              label={t("readmeSkeleton.calloutKind")}
              value={calloutKind}
              onChange={setCalloutKind}
              options={CALLOUT_KINDS.map((k) => ({ value: k, label: k }))}
            />
            <Input
              aria-label={t("readmeSkeleton.calloutBody")}
              placeholder={t("readmeSkeleton.calloutBodyPlaceholder")}
              value={calloutBody}
              onChange={(e) => setCalloutBody(e.target.value)}
            />
          </div>
        );
      case "installation":
        return (
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <RunnerSelect
              id={`${uid}-install-lang`}
              label={t("readmeSkeleton.fenceLanguage")}
              value={installLanguage}
              onChange={setInstallLanguage}
              options={FENCE_LANGUAGES.map((l) => ({ value: l, label: l }))}
            />
            <Input
              aria-label={t("readmeSkeleton.installCommand")}
              placeholder={t("readmeSkeleton.installCommandPlaceholder")}
              value={installCommand}
              onChange={(e) => setInstallCommand(e.target.value)}
            />
          </div>
        );
      case "usage":
        return (
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <RunnerSelect
              id={`${uid}-usage-lang`}
              label={t("readmeSkeleton.fenceLanguage")}
              value={usageLanguage}
              onChange={setUsageLanguage}
              options={FENCE_LANGUAGES.map((l) => ({ value: l, label: l }))}
            />
            <Textarea
              aria-label={t("readmeSkeleton.usageExample")}
              placeholder={t("readmeSkeleton.usageExamplePlaceholder")}
              rows={3}
              value={usageExample}
              onChange={(e) => setUsageExample(e.target.value)}
            />
          </div>
        );
      case "features":
        return (
          <Textarea
            aria-label={t("readmeSkeleton.features")}
            placeholder={t("readmeSkeleton.featuresPlaceholder")}
            rows={3}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />
        );
      case "support":
        return (
          <Input
            aria-label={t("readmeSkeleton.contact")}
            placeholder={t("readmeSkeleton.contactPlaceholder")}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        );
      case "license":
        return (
          <RunnerSelect
            id={`${uid}-license`}
            label={t("readmeSkeleton.license")}
            value={license}
            onChange={setLicense}
            options={SPDX_IDS.map((s) => ({ value: s, label: s }))}
          />
        );
      case "authors":
        return (
          <Input
            aria-label={t("readmeSkeleton.authors")}
            placeholder={t("readmeSkeleton.authorsPlaceholder")}
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
          />
        );
      case "tech-stack":
        return (
          <Input
            aria-label={t("readmeSkeleton.techStack")}
            placeholder={t("readmeSkeleton.techStackPlaceholder")}
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ConfigureGenerateShell<ReadmeOutput>
      engine={{ toolId, parse: (o) => o as unknown as ReadmeOutput }}
      input={input}
      emptyHint={t("readmeSkeleton.emptyHint")}
      note={t("readmeSkeleton.note")}
      exit={(out) => ({
        text: out.markdown,
        json: out,
        filename: out.filename,
        mimeType: "text/markdown;charset=utf-8",
      })}
      renderResult={(out) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <ShellBadge tone="info">
              {t("readmeSkeleton.sectionCount", { n: out.sectionsIncluded.length })}
            </ShellBadge>
            <ShellBadge>{t("readmeSkeleton.charCount", { n: out.chars })}</ShellBadge>
            {out.warnings.length > 0 ? (
              <ShellBadge tone="warning">
                {t("readmeSkeleton.warningCount", { n: out.warnings.length })}
              </ShellBadge>
            ) : null}
          </div>
          <ShellCode label={out.filename}>{out.markdown}</ShellCode>
          {out.sectionsOmitted.length > 0 || out.warnings.length > 0 ? (
            <ShellDrill summary={t("readmeSkeleton.omittedTitle")}>
              <ul className="space-y-1 text-sm text-[var(--neutral-11)]">
                {out.sectionsOmitted.map((o) => (
                  <li key={o.section}>
                    <span className="font-mono">{t(`readmeSkeleton.section.${o.section}`)}</span> —{" "}
                    {o.reason}
                  </li>
                ))}
                {out.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </ShellDrill>
          ) : null}
        </div>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTION_GROUPS.map((group) => (
          <fieldset key={group.id} className="space-y-2">
            <legend className="text-xs font-medium text-[var(--neutral-10)]">
              {t(`readmeSkeleton.group.${group.id}`)}
            </legend>
            {group.sections.map((id) => (
              <div key={id} className="space-y-2">
                <Checkbox checked={on(id)} onChange={(next) => toggle(id, next)}>
                  {t(`readmeSkeleton.section.${id}`)}
                </Checkbox>
                {detail(id)}
              </div>
            ))}
          </fieldset>
        ))}
      </div>
      <ShellNote>{t("readmeSkeleton.orderNote")}</ShellNote>
    </ConfigureGenerateShell>
  );
}
