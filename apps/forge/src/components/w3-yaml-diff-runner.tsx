"use client";

/**
 * Comparator · yaml-diff (brief: docs/plans/tools/yaml-diff.md, archetype §8
 * two-pane compare — the JTBD is inescapably "I have a before and an after").
 *
 * The shell owns the two panes, the live recompute, the idle/running/error
 * states, the change-list navigation and the exits. This file owns the two
 * options the brief makes explicit (semantic vs raw-text — SmartFormatter's
 * unexplained "Semantic Sync" toggle, named; and anchor resolution, the fork
 * Diffchecker and CompareText.org contradict each other on), the per-pane
 * parse badge, the projection of the machine payload onto the change list, and
 * the "how this comparison works" disclosure that states our position on every
 * §7 domain question.
 *
 * The engine runs *in this component*: config diffs routinely carry hostnames,
 * secret names and cluster topology, so the payload never leaves the browser
 * (ship gate §6.5 #8, brief §9.5). It is byte-for-byte the same `diffYaml` the
 * agent API runs server-side, through the same zod schema, so the human page
 * and the OpenAPI/MCP surface cannot drift — `toolId` is carried anyway so the
 * page names the identical server operation.
 */

import {
  diffYaml,
  validateYamlText,
  type YamlDiffOutput,
  yamlDiffInputSchema,
} from "@nebutra/forge-runtime/yaml-diff";
import { Checkbox } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import {
  ShellBadge,
  type ShellChange,
  ShellCode,
  ShellDrill,
  ShellNote,
  type ShellTone,
  TwoPaneCompareShell,
} from "@/components/journey-shells";
import { RunnerSelect } from "@/components/runner-select";

/** Note codes the engine emits and this page has copy for. */
const NOTE_CODES = new Set([
  "raw-text-mode",
  "parse-error",
  "document-count-mismatch",
  "merge-keys-expanded",
  "anchors-unresolved",
  "yaml11-ambiguous-scalars",
  "sequence-matched-by-identity",
  "duplicate-keys",
  "truncated",
]);

const MAX_VALUE_CHARS = 200;

const SAMPLE_LEFT = [
  "apiVersion: apps/v1",
  "kind: Deployment",
  "metadata:",
  "  name: web",
  "spec:",
  "  replicas: 2",
  "  template:",
  "    spec:",
  "      containers:",
  "        - name: app",
  "          image: app:1.4.0",
  "          ports:",
  "            - containerPort: 8080",
  "        - name: sidecar",
  "          image: envoy:1.28",
  "",
].join("\n");

const SAMPLE_RIGHT = [
  "apiVersion: apps/v1",
  "kind: Deployment",
  "spec:",
  "  template:",
  "    spec:",
  "      containers:",
  "        - name: init",
  "          image: busybox:1.36",
  "        - name: app",
  "          image: app:1.5.0",
  "          ports:",
  '            - containerPort: "8080"',
  "        - name: sidecar",
  "          image: envoy:1.28",
  "  replicas: 3",
  "metadata:",
  "  name: web",
  "",
].join("\n");

function formatValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return undefined;
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…` : text;
}

/**
 * The change list is a projection of an already-computed payload, and the
 * shell asks for it on every render — so the formatting work is done once per
 * result and remembered, never per keystroke of an unrelated control.
 */
const rowCache = new WeakMap<YamlDiffOutput, readonly ShellChange[]>();

function rowsOf(output: YamlDiffOutput): readonly ShellChange[] {
  const cached = rowCache.get(output);
  if (cached) return cached;
  const rows: ShellChange[] = output.changes.map((change, index) => {
    // Hoisted so the narrowing survives: calling formatValue twice leaves the
    // type as string | undefined under exactOptionalPropertyTypes.
    const before = formatValue(change.before);
    const after = formatValue(change.after);
    return {
      id: `${change.path}-${change.changeType}-${index}`,
      path: change.path,
      // The machine token, not a translated label: it is the same string the JSON
      // payload carries, and the shell derives its tone from it.
      kind: change.changeType,
      ...(before === undefined ? {} : { before }),
      ...(after === undefined ? {} : { after }),
      ...(change.beforeType && change.afterType && change.beforeType !== change.afterType
        ? { note: `${change.beforeType} → ${change.afterType}` }
        : {}),
    };
  });
  rowCache.set(output, rows);
  return rows;
}

export function W3YamlDiffRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [mode, setMode] = useState("semantic");
  const [resolveAnchors, setResolveAnchors] = useState(true);

  // Parsed once per distinct pane text — the shell calls `paneStatus` on every
  // render, and parsing a megabyte of YAML per keystroke of an option control
  // is exactly what that contract warns against.
  const [statusCache] = useState(() => new Map<string, ReturnType<typeof validateYamlText>>());
  const paneStatus = useCallback(
    (text: string): { tone: ShellTone; label: string } | null => {
      if (!text.trim()) return null;
      if (mode === "raw-text") return null;
      let status = statusCache.get(text);
      if (!status) {
        status = validateYamlText(text);
        if (statusCache.size > 4) statusCache.clear();
        statusCache.set(text, status);
      }
      if (status.ok) {
        return {
          tone: "success",
          label:
            status.documents > 1
              ? t("yamlDiff.validMulti", { n: status.documents })
              : t("yamlDiff.valid"),
        };
      }
      return { tone: "danger", label: t("yamlDiff.invalid", { line: status.line }) };
    },
    [mode, statusCache, t],
  );

  return (
    <TwoPaneCompareShell<YamlDiffOutput>
      engine={{
        toolId,
        compute: (input) => diffYaml(yamlDiffInputSchema.parse(input)),
      }}
      leftLabel={t("yamlDiff.original")}
      rightLabel={t("yamlDiff.changed")}
      leftPlaceholder={t("yamlDiff.originalPlaceholder")}
      rightPlaceholder={t("yamlDiff.changedPlaceholder")}
      rows={14}
      sample={{ left: SAMPLE_LEFT, right: SAMPLE_RIGHT }}
      optionsKey={`${mode}|${resolveAnchors}`}
      options={
        <>
          <RunnerSelect
            id="yaml-diff-mode"
            label={t("yamlDiff.modeLabel")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "semantic", label: t("yamlDiff.modeSemantic") },
              { value: "raw-text", label: t("yamlDiff.modeRawText") },
            ]}
          />
          {mode === "semantic" ? (
            <Checkbox
              id="yaml-diff-resolve-anchors"
              checked={resolveAnchors}
              onChange={setResolveAnchors}
            >
              {t("yamlDiff.resolveAnchors")}
            </Checkbox>
          ) : null}
        </>
      }
      paneStatus={paneStatus}
      buildInput={(left, right) => {
        if (!left.trim() || !right.trim()) return null;
        return { original: left, changed: right, mode, resolveAnchors };
      }}
      emptyHint={t("yamlDiff.idle")}
      note={t("yamlDiff.privacy")}
      summary={(output) => {
        if (output.parseErrors.original || output.parseErrors.changed) {
          return { tone: "danger" as const, headline: t("yamlDiff.parseFailed") };
        }
        if (output.equivalent) {
          return {
            tone: "success" as const,
            headline:
              output.summary.structural > 0
                ? t("yamlDiff.equivalentStructural", { n: output.summary.structural })
                : t("yamlDiff.equivalent"),
          };
        }
        return {
          tone: "warning" as const,
          headline: t("yamlDiff.summary", {
            added: output.summary.added,
            removed: output.summary.removed,
            changed: output.summary.changed,
            typeChanged: output.summary.typeChanged,
          }),
        };
      }}
      changes={rowsOf}
      exit={(output) => ({
        text: output.unified,
        json: output,
        filename: "yaml-diff.diff",
        mimeType: "text/x-diff;charset=utf-8",
      })}
      renderResult={(output) => (
        <div className="space-y-3">
          {output.parseErrors.original ? (
            <ShellCode label={t("yamlDiff.original")}>
              {t("yamlDiff.parseErrorAt", {
                side: t("yamlDiff.original"),
                line: output.parseErrors.original.line,
                column: output.parseErrors.original.column,
                message: output.parseErrors.original.message,
              })}
            </ShellCode>
          ) : null}
          {output.parseErrors.changed ? (
            <ShellCode label={t("yamlDiff.changed")}>
              {t("yamlDiff.parseErrorAt", {
                side: t("yamlDiff.changed"),
                line: output.parseErrors.changed.line,
                column: output.parseErrors.changed.column,
                message: output.parseErrors.changed.message,
              })}
            </ShellCode>
          ) : null}

          {output.documentCountMismatch ? (
            <ShellBadge tone="warning">
              {t("yamlDiff.documentCountMismatch", {
                original: output.documentCountMismatch.originalCount,
                changed: output.documentCountMismatch.changedCount,
              })}
            </ShellBadge>
          ) : null}

          {output.notes.length > 0 ? (
            <ul className="space-y-1">
              {output.notes.map((note) => (
                <li key={note.code}>
                  <ShellNote>
                    {NOTE_CODES.has(note.code) ? t(`yamlDiff.note.${note.code}`) : note.message}
                    {note.detail ? ` · ${note.detail}` : ""}
                  </ShellNote>
                </li>
              ))}
            </ul>
          ) : null}

          {output.duplicateKeyWarnings.length > 0 ? (
            <ShellCode label={t("yamlDiff.duplicateKeys")}>
              {output.duplicateKeyWarnings
                .map((warning) => `${warning.document}: ${warning.path}`)
                .join("\n")}
            </ShellCode>
          ) : null}

          {output.unified ? (
            <ShellDrill summary={t("yamlDiff.unified")}>
              <ShellCode label={t("yamlDiff.unified")}>{output.unified}</ShellCode>
            </ShellDrill>
          ) : null}

          <ShellDrill summary={t("yamlDiff.howItWorks")}>
            <ul className="space-y-1.5 text-sm text-[var(--neutral-11)]">
              <li>{t("yamlDiff.rule.keyOrder")}</li>
              <li>{t("yamlDiff.rule.anchors")}</li>
              <li>{t("yamlDiff.rule.mergeKeys")}</li>
              <li>{t("yamlDiff.rule.types")}</li>
              <li>{t("yamlDiff.rule.sequences")}</li>
              <li>{t("yamlDiff.rule.blockScalars")}</li>
              <li>{t("yamlDiff.rule.comments")}</li>
              <li>{t("yamlDiff.rule.multiDoc")}</li>
              <li>{t("yamlDiff.rule.duplicateKeys")}</li>
            </ul>
          </ShellDrill>
        </div>
      )}
    />
  );
}
