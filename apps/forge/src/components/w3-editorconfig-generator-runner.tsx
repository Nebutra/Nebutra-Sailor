"use client";

/**
 * .editorconfig generator — configure-then-generate (brief §8).
 *
 * The options *are* the product: there is nothing to paste and transform, so
 * the shell regenerates the artifact on every change and the page is useful
 * before the first click. Import is the one manual action, because pasting a
 * file is a deliberate reset of the whole form, not a keystroke.
 */
import { Button, Checkbox, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useId, useMemo, useState } from "react";
import {
  ConfigureGenerateShell,
  invokeForgeTool,
  ShellBadge,
  ShellNote,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-ui";
import { FilePaperSpecimen, filePaperStats } from "@/components/specimens";

interface Warning {
  code: string;
  level: "info" | "warning";
  message: string;
  glob?: string;
  property?: string;
}

interface Output {
  editorconfig: string;
  filename: string;
  root: boolean;
  sections: { glob: string; properties: Record<string, string> }[];
  propertyCount: number;
  warnings: Warning[];
}

interface SectionState {
  id: string;
  glob: string;
  props: Record<string, string>;
}

/** "" means "leave the property out" — distinct from the spec's `unset`. */
const NOT_SET = "";

const FIELDS: readonly { name: string; values: readonly string[] }[] = [
  { name: "indent_style", values: ["space", "tab", "unset"] },
  { name: "indent_size", values: ["1", "2", "3", "4", "6", "8", "tab", "unset"] },
  { name: "tab_width", values: ["2", "4", "8", "unset"] },
  { name: "end_of_line", values: ["lf", "crlf", "cr", "unset"] },
  { name: "charset", values: ["utf-8", "utf-8-bom", "latin1", "utf-16le", "utf-16be", "unset"] },
  { name: "trim_trailing_whitespace", values: ["true", "false", "unset"] },
  { name: "insert_final_newline", values: ["true", "false", "unset"] },
  { name: "max_line_length", values: ["80", "100", "120", "off", "unset"] },
];

const QUICK_GLOBS = ["*", "*.md", "*.py", "*.go", "Makefile", "package.json", "*.{yml,yaml}"];

const DEFAULT_PROPS: Record<string, string> = {
  charset: "utf-8",
  indent_style: "space",
  indent_size: "2",
  end_of_line: "lf",
  insert_final_newline: "true",
  trim_trailing_whitespace: "true",
};

type PresetId = "spaces2" | "spaces4" | "tabs" | "repo";

/**
 * Preset names describe what they do rather than naming somebody else's tool —
 * the brief flagged borrowed preset names as an implied endorsement.
 */
const PRESETS: Record<PresetId, { root: boolean; sections: Omit<SectionState, "id">[] }> = {
  spaces2: { root: true, sections: [{ glob: "*", props: DEFAULT_PROPS }] },
  spaces4: { root: true, sections: [{ glob: "*", props: { ...DEFAULT_PROPS, indent_size: "4" } }] },
  tabs: {
    root: true,
    sections: [
      {
        glob: "*",
        props: { ...DEFAULT_PROPS, indent_style: "tab", indent_size: "tab", tab_width: "4" },
      },
    ],
  },
  repo: {
    root: true,
    sections: [
      { glob: "*", props: DEFAULT_PROPS },
      // Two trailing spaces are a hard line break in Markdown — trimming them
      // silently rewrites the document.
      { glob: "*.md", props: { trim_trailing_whitespace: "false" } },
      // A recipe line in a Makefile must start with a real tab.
      { glob: "Makefile", props: { indent_style: "tab" } },
    ],
  },
};

// Ids only key React rows. The first one is fixed so the server and client
// render identical ids; the counter is only ever bumped by an interaction.
let sectionSeq = 0;
function newSection(glob: string, props: Record<string, string>): SectionState {
  sectionSeq += 1;
  return { id: `s${sectionSeq}`, glob, props };
}

export function W3EditorconfigGeneratorRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const uid = useId();
  const [root, setRoot] = useState(true);
  const [sections, setSections] = useState<SectionState[]>(() => [
    { id: "s0", glob: "*", props: DEFAULT_PROPS },
  ]);
  const [source, setSource] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const applyPreset = useCallback((id: PresetId) => {
    const preset = PRESETS[id];
    setRoot(preset.root);
    setSections(preset.sections.map((s) => newSection(s.glob, s.props)));
  }, []);

  const patchSection = useCallback((id: string, patch: Partial<Omit<SectionState, "id">>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const setProp = useCallback((id: string, name: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, props: { ...s.props, [name]: value } } : s)),
    );
  }, []);

  const input = useMemo(() => {
    const payload = sections.map((s) => ({
      glob: s.glob,
      properties: Object.fromEntries(
        Object.entries(s.props).filter(([, v]) => v !== NOT_SET),
      ) as Record<string, string>,
    }));
    if (payload.length === 0) return null;
    if (payload.every((s) => Object.keys(s.properties).length === 0)) return null;
    return { root, sections: payload };
  }, [root, sections]);

  const runImport = useCallback(async () => {
    if (!source.trim()) return;
    setImporting(true);
    setImportError(null);
    const outcome = await invokeForgeTool(toolId, { source });
    setImporting(false);
    if (!outcome.ok) {
      setImportError(outcome.message);
      return;
    }
    const parsed = outcome.output as unknown as Output;
    setRoot(parsed.root);
    setSections(
      parsed.sections.length > 0
        ? parsed.sections.map((s) => newSection(s.glob, s.properties))
        : [newSection("*", {})],
    );
    setSource("");
  }, [source, toolId]);

  return (
    <ConfigureGenerateShell<Output>
      engine={{ toolId, parse: (o) => o as unknown as Output }}
      input={input}
      emptyHint={t("editorconfig.emptyHint")}
      note={t("editorconfig.note")}
      exit={(o) => ({
        text: o.editorconfig,
        json: o,
        // Extension-only on purpose: the artifact is literally ".editorconfig".
        filename: o.filename,
        mimeType: "text/plain;charset=utf-8",
      })}
      renderResult={(o) => (
        <div className="space-y-3">
          {(() => {
            const stats = filePaperStats(o.editorconfig);
            return (
              <FilePaperSpecimen
                filename={o.filename || ".editorconfig"}
                content={o.editorconfig}
                linesLabel={t("filePaper.lines", { n: stats.lines })}
                charsLabel={t("filePaper.chars", { n: stats.chars })}
                emptyLabel={t("filePaper.empty")}
              />
            );
          })()}
          {o.warnings.length > 0 ? (
            <ul className="space-y-1.5" aria-label={t("editorconfig.checks")}>
              {o.warnings.map((w) => (
                <li key={`${w.code}-${w.glob ?? ""}-${w.property ?? ""}`} className="flex gap-2">
                  <ShellBadge tone={w.level === "warning" ? "warning" : "info"}>
                    {w.property ?? w.code}
                  </ShellBadge>
                  <span className="text-sm text-[var(--neutral-11)]">{w.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    >
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--neutral-11)]">{t("editorconfig.presets")}</p>
        <div className="flex flex-wrap gap-1.5">
          {(["spaces2", "spaces4", "tabs", "repo"] as const).map((id) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyPreset(id)}
            >
              {t(`editorconfig.preset.${id}`)}
            </Button>
          ))}
        </div>
      </div>

      <Checkbox id={`${uid}-root`} checked={root} onChange={setRoot}>
        <span className="text-sm">{t("editorconfig.rootLabel")}</span>
      </Checkbox>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="space-y-3 rounded-[var(--radius-lg)] bg-[var(--neutral-3)] p-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <Input
                id={`${uid}-glob-${section.id}`}
                label={t("editorconfig.glob", { n: index + 1 })}
                value={section.glob}
                onChange={(e) => patchSection(section.id, { glob: e.target.value })}
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
              />
              {sections.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSections((prev) => prev.filter((s) => s.id !== section.id))}
                >
                  {t("editorconfig.removeSection")}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_GLOBS.map((glob) => (
                <Button
                  key={glob}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patchSection(section.id, { glob })}
                >
                  <span className="font-mono text-xs">{glob}</span>
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {FIELDS.map((field) => (
                <RunnerSelect
                  key={field.name}
                  id={`${uid}-${section.id}-${field.name}`}
                  label={field.name}
                  value={section.props[field.name] ?? NOT_SET}
                  onChange={(value) => setProp(section.id, field.name, value)}
                  options={[
                    { value: NOT_SET, label: t("editorconfig.notSet") },
                    ...field.values.map((v) => ({ value: v, label: v })),
                  ]}
                />
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSections((prev) => [...prev, newSection("*.md", {})])}
        >
          {t("editorconfig.addSection")}
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          id={`${uid}-import`}
          label={t("editorconfig.import")}
          value={source}
          placeholder={t("editorconfig.importPlaceholder")}
          rows={4}
          onChange={(e) => setSource(e.target.value)}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={importing || source.trim() === ""}
            onClick={() => void runImport()}
          >
            {importing ? t("editorconfig.importing") : t("editorconfig.importAction")}
          </Button>
          {importError ? (
            <ShellNote>{t("editorconfig.importFailed", { message: importError })}</ShellNote>
          ) : null}
        </div>
      </div>
    </ConfigureGenerateShell>
  );
}
