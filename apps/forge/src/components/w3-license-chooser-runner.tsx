"use client";

/**
 * Journey: single-step scenario triage fused into configure-then-generate
 * (brief docs/plans/tools/license-chooser.md §8 — deliberately NOT a
 * "question 3 of 5" wizard). One question in cards, the reveal directly under
 * it, and the LICENSE file filling in live on the same screen, at the same
 * scroll position. Layout, states, copy/download and announcements belong to
 * the shells; this file supplies fields, renderers and labels only.
 */

import { Checkbox, Input } from "@nebutra/ui/primitives";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useMemo, useState } from "react";
import {
  ConfigureGenerateShell,
  DecisionShell,
  type DecisionShellOption,
  type ShellArtifact,
  ShellArtifacts,
  ShellBadge,
  ShellDrill,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";
import { FilePaperSpecimen, filePaperStats } from "@/components/specimens";
import { pickBilingual } from "@/lib/bilingual";

const RECOMMEND_TOOL_ID = "template/license-recommend";
const GENERATE_TOOL_ID = "template/license-generate";

type Scenario = "permissive" | "copyleft" | "community" | "non-software" | "unsure";

interface Alternate {
  spdxId: string;
  name: string;
  why: string;
  whyZh: string;
}

interface Recommendation {
  scenario: Scenario;
  spdxId: string | null;
  name: string | null;
  family: string | null;
  url: string | null;
  rationale: string;
  rationaleZh: string;
  permissions: string[];
  conditions: string[];
  limitations: string[];
  alternates: Alternate[];
  generatable: boolean;
  nextStep: string | null;
  nextStepZh: string | null;
  noLicenseWarning: string;
  noLicenseWarningZh: string;
}

interface GeneratedLicense {
  spdxId: string;
  name: string;
  filename: string;
  text: string;
  holderSubstituted: boolean;
  spdxHeaderSnippet: string;
  noticeSnippet: string | null;
  manifest: Record<string, string>;
  placement: string;
  placementZh: string;
}

const SCENARIOS: readonly Scenario[] = [
  "permissive",
  "copyleft",
  "community",
  "non-software",
  "unsure",
];

const FAMILY_TONE: Record<string, ShellTone> = {
  permissive: "success",
  "weak-copyleft": "info",
  "strong-copyleft": "warning",
  "public-domain": "success",
  content: "info",
};

/* ── the fused journey ─────────────────────────────────────────────────── */

export function W3LicenseChooserRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const locale = useLocale();
  const uid = useId();

  // One runner serves both operations' pages: deciding and generating are one
  // screen here, which is the whole differentiator (§9.5).
  const recommendId = toolId.endsWith("license-recommend") ? toolId : RECOMMEND_TOOL_ID;
  const generateId = toolId.endsWith("license-generate") ? toolId : GENERATE_TOOL_ID;

  const [scenario, setScenario] = useState<string | null>(null);
  const [patentConcern, setPatentConcern] = useState(false);
  const [networkService, setNetworkService] = useState(false);
  const [isLibrary, setIsLibrary] = useState(false);
  const [allowLater, setAllowLater] = useState(true);

  const engine = useMemo(
    () => ({
      toolId: recommendId,
      parse: (output: Record<string, unknown>) => output as unknown as Recommendation,
    }),
    [recommendId],
  );

  const options: DecisionShellOption[] = SCENARIOS.map((id) => ({
    id,
    label: t(`licenseChooser.scenario.${id}.label` as never),
    detail: t(`licenseChooser.scenario.${id}.detail` as never),
  }));

  const input = scenario
    ? {
        scenario,
        patentConcern,
        networkService,
        projectKind: isLibrary ? "library" : "application",
        futureVersions: allowLater ? "or-later" : "only",
      }
    : null;

  const showPatent = scenario === "permissive" || scenario === "unsure";
  const showCopyleft = scenario === "copyleft";

  let refinements: ReactNode;
  if (showPatent) {
    refinements = (
      <Checkbox checked={patentConcern} onChange={setPatentConcern} id={`${uid}-patent`}>
        {t("licenseChooser.refine.patent")}
      </Checkbox>
    );
  } else if (showCopyleft) {
    refinements = (
      <div className="space-y-3">
        <Checkbox checked={networkService} onChange={setNetworkService} id={`${uid}-network`}>
          {t("licenseChooser.refine.network")}
        </Checkbox>
        <Checkbox checked={isLibrary} onChange={setIsLibrary} id={`${uid}-library`}>
          {t("licenseChooser.refine.library")}
        </Checkbox>
        <Checkbox checked={allowLater} onChange={setAllowLater} id={`${uid}-later`}>
          {t("licenseChooser.refine.later")}
        </Checkbox>
      </div>
    );
  } else {
    refinements = <ShellNote>{t("licenseChooser.refine.none")}</ShellNote>;
  }

  return (
    <DecisionShell
      prompt={t("licenseChooser.prompt")}
      options={options}
      value={scenario}
      onChange={setScenario}
      aside={
        <ShellDrill summary={t("licenseChooser.noLicense.summary")}>
          <p className="text-sm text-[var(--neutral-11)]">{t("licenseChooser.noLicense.body")}</p>
        </ShellDrill>
      }
    >
      <ConfigureGenerateShell
        engine={engine}
        input={input}
        emptyHint={t("licenseChooser.pickScenario")}
        note={t("licenseChooser.disclaimer")}
        exit={(rec) => ({ json: rec })}
        renderResult={(rec) => (
          <RecommendationPanel
            key={rec.spdxId ?? "none"}
            rec={rec}
            generateId={generateId}
            locale={locale}
          />
        )}
      >
        {refinements}
      </ConfigureGenerateShell>
    </DecisionShell>
  );
}

/* ── the reveal ────────────────────────────────────────────────────────── */

function FlagRow({ tone, label, flags }: { tone: ShellTone; label: string; flags: string[] }) {
  const t = useTranslations("runners");
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[var(--neutral-10)]">{label}</span>
      {flags.map((flag) => (
        <ShellBadge key={flag} tone={tone}>
          {t(`licenseChooser.flag.${flag}` as never)}
        </ShellBadge>
      ))}
    </div>
  );
}

function RecommendationPanel({
  rec,
  generateId,
  locale,
}: {
  rec: Recommendation;
  generateId: string;
  locale: string;
}) {
  const t = useTranslations("runners");
  // The alternates in every generatable branch are themselves generatable —
  // the only non-generatable licenses are the content ones, and those appear
  // solely in the non-software branch, where `generatable` is already false.
  const [selected, setSelected] = useState<string | null>(rec.spdxId);

  const rationale = pickBilingual(locale, { zh: rec.rationaleZh, en: rec.rationale });
  const nextStep =
    rec.nextStep && rec.nextStepZh
      ? pickBilingual(locale, { zh: rec.nextStepZh, en: rec.nextStep })
      : null;
  const tone = rec.family ? (FAMILY_TONE[rec.family] ?? "info") : "warning";

  return (
    <div className="space-y-4">
      <ShellVerdict
        tone={tone}
        headline={rec.name ?? t("licenseChooser.noAnswer")}
        caveat={rationale}
        badges={
          <>
            {rec.spdxId ? <ShellBadge tone="neutral">{rec.spdxId}</ShellBadge> : null}
            {rec.family ? (
              <ShellBadge tone={tone}>
                {t(`licenseChooser.family.${rec.family}` as never)}
              </ShellBadge>
            ) : null}
          </>
        }
      />

      {rec.spdxId ? (
        <div className="space-y-2">
          <FlagRow tone="success" label={t("licenseChooser.permissions")} flags={rec.permissions} />
          <FlagRow tone="warning" label={t("licenseChooser.conditions")} flags={rec.conditions} />
          <FlagRow tone="danger" label={t("licenseChooser.limitations")} flags={rec.limitations} />
        </div>
      ) : null}

      {nextStep ? <ShellNote>{nextStep}</ShellNote> : null}

      {rec.alternates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--neutral-10)]">{t("licenseChooser.alternates")}</p>
          <ul className="space-y-2">
            {rec.alternates.map((alt) => (
              <li key={alt.spdxId} className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--neutral-12)]">{alt.name}</span>
                  <ShellBadge tone="neutral">{alt.spdxId}</ShellBadge>
                  {rec.generatable ? (
                    <button
                      type="button"
                      onClick={() => setSelected(alt.spdxId)}
                      aria-pressed={selected === alt.spdxId}
                      className="rounded-full bg-[var(--neutral-3)] px-3 py-1 text-xs text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-4)] aria-pressed:bg-[var(--blue-3)] aria-pressed:text-[var(--neutral-12)]"
                    >
                      {t("licenseChooser.useThis")}
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[var(--neutral-11)]">
                  {pickBilingual(locale, { zh: alt.whyZh, en: alt.why })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rec.generatable && selected ? (
        <LicenseFile spdxId={selected} generateId={generateId} locale={locale} />
      ) : null}

      {rec.url ? (
        <ShellNote>
          <a href={rec.url} target="_blank" rel="noreferrer" className="underline">
            {t("licenseChooser.readCanonical")}
          </a>
        </ShellNote>
      ) : null}

      <ShellNote>
        {pickBilingual(locale, { zh: rec.noLicenseWarningZh, en: rec.noLicenseWarning })}
      </ShellNote>
    </div>
  );
}

/* ── the file, filling in live ─────────────────────────────────────────── */

function LicenseFile({
  spdxId,
  generateId,
  locale,
}: {
  spdxId: string;
  generateId: string;
  locale: string;
}) {
  const t = useTranslations("runners");
  const uid = useId();
  const [holder, setHolder] = useState("");
  // "Now" belongs to the browser: the engine takes an explicit year so the same
  // input always produces the same bytes.
  const [year, setYear] = useState(() => String(new Date().getFullYear()));

  const engine = useMemo(
    () => ({
      toolId: generateId,
      parse: (output: Record<string, unknown>) => output as unknown as GeneratedLicense,
    }),
    [generateId],
  );

  const parsedYear = Number.parseInt(year, 10);
  const input =
    holder.trim() && Number.isInteger(parsedYear)
      ? { spdxId, holder: holder.trim(), year: parsedYear, commentStyle: "slash" }
      : null;

  return (
    <ConfigureGenerateShell
      engine={engine}
      input={input}
      emptyHint={t("licenseChooser.holderHint")}
      exit={(file) => ({ json: file })}
      renderResult={(file) => {
        const artifacts: ShellArtifact[] = [
          { id: "license", label: "LICENSE", body: file.text, filename: "LICENSE" },
          {
            id: "header",
            label: t("licenseChooser.artifact.header"),
            body: file.spdxHeaderSnippet,
            filename: "spdx-header.txt",
          },
        ];
        if (file.noticeSnippet) {
          artifacts.push({
            id: "notice",
            label: t("licenseChooser.artifact.notice"),
            body: file.noticeSnippet,
            filename: "NOTICE",
          });
        }
        return (
          <div className="space-y-3">
            <ShellArtifacts artifacts={artifacts} />
            {file.holderSubstituted ? null : (
              <ShellNote>{t("licenseChooser.verbatim", { name: file.name })}</ShellNote>
            )}
            <ShellDrill summary={t("licenseChooser.manifest")}>
              {(() => {
                const body = Object.entries(file.manifest)
                  .map(([manifestFile, line]) => `${manifestFile}: ${line}`)
                  .join("\n");
                const stats = filePaperStats(body);
                return (
                  <FilePaperSpecimen
                    filename="manifest.txt"
                    content={body}
                    linesLabel={t("filePaper.lines", { n: stats.lines })}
                    charsLabel={t("filePaper.chars", { n: stats.chars })}
                    emptyLabel={t("filePaper.empty")}
                    maxHeightClassName="max-h-48"
                  />
                );
              })()}
            </ShellDrill>
            <ShellNote>
              {pickBilingual(locale, { zh: file.placementZh, en: file.placement })}
            </ShellNote>
          </div>
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id={`${uid}-holder`}
          label={t("licenseChooser.holder")}
          value={holder}
          placeholder={t("licenseChooser.holderPlaceholder")}
          onChange={(e) => setHolder(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <Input
          id={`${uid}-year`}
          label={t("licenseChooser.year")}
          value={year}
          inputMode="numeric"
          onChange={(e) => setYear(e.target.value)}
          autoComplete="off"
        />
      </div>
    </ConfigureGenerateShell>
  );
}
