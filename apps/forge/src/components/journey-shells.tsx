"use client";

/**
 * Journey-archetype shells (design doc §6.7.10, ship gate §6.5 #12).
 *
 * Five archetypes are actually chosen by the briefs in docs/plans/tools/:
 * instant transform, configure-then-generate, decision (scenario triage),
 * drop-and-verdict, two-pane compare. Each has a shell here. A tool supplies
 * its fields, its result renderer and its labels — the shell owns layout,
 * idle/running/error states, the invoke call, copy/download affordances and
 * keyboard behaviour, so 19 tools share one grammar instead of inventing 19.
 *
 * House rules encoded here, so tools never have to re-derive them:
 *  - panels separate by spacing + a tonal background shift, never a border
 *  - no component-level focus rings (global :focus-visible supplies them)
 *  - form controls come from @nebutra/ui/primitives
 *  - live shells keep the previous result on screen while recomputing, so a
 *    keystroke never blanks the page; large input degrades to a longer
 *    debounce and then to an explicit action rather than freezing
 */

import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  Download,
} from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/* ── tone + surface vocabulary ─────────────────────────────────────────── */

export type ShellTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_FG: Record<ShellTone, string> = {
  neutral: "text-[var(--neutral-12)]",
  info: "text-[var(--status-info)]",
  success: "text-[var(--status-success)]",
  warning: "text-[var(--status-warning)]",
  danger: "text-[var(--status-danger)]",
};

const TONE_BG: Record<ShellTone, string> = {
  neutral: "bg-[var(--neutral-3)]",
  info: "bg-[color-mix(in_srgb,var(--status-info)_12%,transparent)]",
  success: "bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)]",
  warning: "bg-[color-mix(in_srgb,var(--status-warning)_14%,transparent)]",
  danger: "bg-[color-mix(in_srgb,var(--status-danger)_12%,transparent)]",
};

/** Tonal panel — the house separator. Never add a border to this. */
const PANEL = "rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4";
const CODE =
  "overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-sm leading-relaxed";
const META = "text-xs text-[var(--neutral-10)]";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── invoke plumbing ───────────────────────────────────────────────────── */

export type InvokeOutcome =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; message: string; code?: string };

/** One invoke path for every shell — the same route an agent calls. */
export async function invokeForgeTool(
  toolId: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<InvokeOutcome> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
    ...(signal ? { signal } : {}),
  });
  // A gateway/proxy failure answers with HTML, not JSON. Parsing that would
  // surface "Unexpected token <" to the user instead of the actual status.
  let body: {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
    code?: string;
  };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { ok: false, message: `HTTP ${res.status}`, code: "invalid_response" };
  }
  if (!res.ok || body.ok === false) {
    return {
      ok: false,
      message: body.message ?? body.error ?? `HTTP ${res.status}`,
      ...(body.code ? { code: body.code } : {}),
    };
  }
  return { ok: true, output: body.output ?? {} };
}

/**
 * How a shell produces a result. Prefer `compute` when the work is pure and
 * cheap enough to stay in the browser (privacy gate §6.5 #8); fall back to
 * `toolId` so the human page and the API run the same engine.
 */
export interface ShellEngine<TOutput> {
  toolId?: string;
  compute?: (input: Record<string, unknown>, signal: AbortSignal) => TOutput | Promise<TOutput>;
  /** Map the raw invoke payload onto the tool's own output shape. */
  parse?: (output: Record<string, unknown>) => TOutput;
}

export type ShellStatus = "idle" | "running" | "ready" | "error";

export interface ShellState<TOutput> {
  status: ShellStatus;
  output?: TOutput;
  error?: string;
  code?: string;
}

/**
 * Debounced, race-safe run loop. Only the newest run may write state, and an
 * in-flight fetch is aborted when a newer one starts — so a fast typist never
 * sees an older answer land on top of a newer one.
 */
export function useShellRun<TOutput>(args: {
  engine: ShellEngine<TOutput>;
  /** Return null to mean "nothing to run yet" — the shell shows its idle state. */
  getInput: () => Record<string, unknown> | null;
  /** Values that, when they change, should trigger a run. */
  deps: readonly unknown[];
  auto?: boolean;
  debounceMs?: number;
}): { state: ShellState<TOutput>; runNow: () => void; reset: () => void } {
  const { engine, getInput, deps, auto = true, debounceMs = 180 } = args;
  const [state, setState] = useState<ShellState<TOutput>>({ status: "idle" });

  const getInputRef = useRef(getInput);
  const engineRef = useRef(engine);
  useEffect(() => {
    getInputRef.current = getInput;
    engineRef.current = engine;
  });

  const tokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    const input = getInputRef.current();
    tokenRef.current += 1;
    if (input === null) {
      setState({ status: "idle" });
      return;
    }
    const token = tokenRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "running" });
    const active = engineRef.current;
    void (async () => {
      try {
        let output: TOutput;
        if (active.compute) {
          output = await active.compute(input, controller.signal);
        } else if (active.toolId) {
          const r = await invokeForgeTool(active.toolId, input, controller.signal);
          if (!r.ok) {
            if (token === tokenRef.current) {
              setState({ status: "error", error: r.message, ...(r.code ? { code: r.code } : {}) });
            }
            return;
          }
          output = active.parse ? active.parse(r.output) : (r.output as unknown as TOutput);
        } else {
          throw new Error("ShellEngine needs either toolId or compute");
        }
        if (token === tokenRef.current) setState({ status: "ready", output });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (token === tokenRef.current) {
          setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
        }
      }
    })();
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    tokenRef.current += 1;
    setState({ status: "idle" });
  }, []);

  // Run triggers are the caller-owned `deps` — spread in so a shell decides
  // what a "change" is (cheap identity checks, never a deep serialize of a
  // megabyte paste).
  useEffect(() => {
    if (!auto) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      execute();
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [auto, debounceMs, execute, ...deps]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  return { state, runNow: execute, reset };
}

/* ── exits: copy / copy JSON / download ────────────────────────────────── */

export interface ShellExit {
  /** Plain-text payload a human pastes into a ticket. */
  text?: string;
  /** Machine payload — the same shape the API returns, so agents and humans agree. */
  json?: unknown;
  /** Real filename, extension included or deliberately absent (`LICENSE`, `.gitignore`). */
  filename?: string;
  mimeType?: string;
}

export function downloadText(
  filename: string,
  text: string,
  mimeType = "text/plain;charset=utf-8",
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedKey(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiedKey(null), 1400);
  }, []);
  return { copiedKey, copy };
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return "";
  }
}

/** Copy / Copy JSON / Download — every shell mounts this next to its output. */
export function ShellExitActions({ exit, idPrefix }: { exit: ShellExit; idPrefix?: string }) {
  const t = useTranslations("runners");
  const { copiedKey, copy } = useCopy();
  const jsonText = exit.json === undefined ? "" : stringifyJson(exit.json);
  const key = idPrefix ?? "exit";
  if (!exit.text && !jsonText && !exit.filename) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {exit.text ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => copy(`${key}-text`, exit.text ?? "")}
        >
          {copiedKey === `${key}-text` ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiedKey === `${key}-text` ? t("common.copied") : t("common.copy")}
        </Button>
      ) : null}
      {jsonText ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => copy(`${key}-json`, jsonText)}
        >
          {copiedKey === `${key}-json` ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiedKey === `${key}-json` ? t("common.copied") : t("shell.copyJson")}
        </Button>
      ) : null}
      {exit.filename ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            downloadText(
              exit.filename ?? "forge.txt",
              exit.text ?? jsonText,
              exit.mimeType ?? "text/plain;charset=utf-8",
            )
          }
        >
          <Download className="h-4 w-4" />
          {t("common.download")}
        </Button>
      ) : null}
    </div>
  );
}

/* ── shared display parts (compose these inside a tool's renderer) ─────── */

export function ShellNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className={META}>{children}</p>;
}

export function ShellError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p
      className={cx(
        "rounded-[var(--radius-lg)] p-3 font-mono text-sm",
        TONE_BG.danger,
        TONE_FG.danger,
      )}
    >
      {message}
    </p>
  );
}

/** Monospace payload block. Scrolls inside itself so the page never does. */
export function ShellCode({ children, label }: { children: string; label?: string }) {
  return (
    <figure className="m-0" aria-label={label}>
      <pre className={CODE}>{children}</pre>
    </figure>
  );
}

export function ShellBadge({
  tone = "neutral",
  children,
}: {
  tone?: ShellTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_BG[tone],
        TONE_FG[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The one headline answer a drop-and-verdict tool exists to give. */
export function ShellVerdict({
  tone = "neutral",
  headline,
  caveat,
  badges,
}: {
  tone?: ShellTone;
  headline: ReactNode;
  caveat?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className={cx("rounded-[var(--radius-lg)] p-4", TONE_BG[tone])}>
      <p className={cx("text-lg font-semibold", TONE_FG[tone])}>{headline}</p>
      {caveat ? <p className="mt-1 text-sm text-[var(--neutral-11)]">{caveat}</p> : null}
      {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
    </div>
  );
}

/** Detail on demand — collapsed by default, keyboard-operable for free. */
export function ShellDrill({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)]" open={defaultOpen}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--neutral-11)]">
        {summary}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-4 w-2/5 animate-pulse rounded bg-[var(--neutral-4)]" />
      <div className="h-4 w-3/5 animate-pulse rounded bg-[var(--neutral-4)]" />
    </div>
  );
}

/**
 * Result region for every shell: announces changes politely (critical when
 * there is no run button), keeps the previous answer visible while a new one
 * computes, and never shows a stale result next to an error.
 */
function ShellStateView<TOutput>({
  state,
  idle,
  children,
}: {
  state: ShellState<TOutput>;
  idle?: ReactNode;
  children: (output: TOutput) => ReactNode;
}) {
  const lastRef = useRef<TOutput | undefined>(undefined);
  if (state.status === "ready") lastRef.current = state.output;
  if (state.status === "idle") lastRef.current = undefined;

  let body: ReactNode = null;
  if (state.status === "error") {
    body = <ShellError message={state.error} />;
  } else if (state.status === "ready" && state.output !== undefined) {
    body = children(state.output);
  } else if (state.status === "running" && lastRef.current !== undefined) {
    body = <div className="opacity-60">{children(lastRef.current)}</div>;
  } else if (state.status === "running") {
    body = <ShellSkeleton />;
  } else {
    body = idle ?? null;
  }

  return (
    <div aria-live="polite" aria-busy={state.status === "running"}>
      {body}
    </div>
  );
}

/* ── input helpers ─────────────────────────────────────────────────────── */

export type ShellSource =
  | { kind: "text"; text: string }
  | {
      kind: "file";
      name: string;
      size: number;
      type: string;
      bytes: Uint8Array;
      truncated: boolean;
    };

/** Read only the leading slice a detector needs — a 2 GB drop must not OOM. */
export async function readFileSample(file: File, maxBytes: number): Promise<ShellSource> {
  const slice = file.size > maxBytes ? file.slice(0, maxBytes) : file;
  const buffer = await slice.arrayBuffer();
  return {
    kind: "file",
    name: file.name,
    size: file.size,
    type: file.type,
    bytes: new Uint8Array(buffer),
    truncated: file.size > maxBytes,
  };
}

export function bytesToHex(bytes: Uint8Array, limit = bytes.length): string {
  let out = "";
  const end = Math.min(limit, bytes.length);
  for (let i = 0; i < end; i += 1) out += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const DEFAULT_LARGE_INPUT = 100_000;
const DEFAULT_MANUAL_ABOVE = 1_000_000;
const DEFAULT_READ_BYTES = 262_144;

function useInputScale(
  length: number,
  largeInputChars: number,
  manualAboveChars: number,
  debounceMs: number,
) {
  return useMemo(() => {
    const manual = length > manualAboveChars;
    const large = !manual && length > largeInputChars;
    return { manual, large, delay: large ? Math.max(debounceMs, 600) : debounceMs };
  }, [length, largeInputChars, manualAboveChars, debounceMs]);
}

/** Cmd/Ctrl+Enter forces an immediate run from any input a shell owns. */
function runShortcut(runNow: () => void) {
  return (e: ReactKeyboardEvent<HTMLElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runNow();
    }
  };
}

function CharCount({ text }: { text: string }) {
  const t = useTranslations("runners");
  return <span className={META}>{t("shell.chars", { n: text.length })}</span>;
}

/* ══ 1. Instant transform ═══════════════════════════════════════════════ */

export interface InstantTransformShellProps<TOutput> {
  engine: ShellEngine<TOutput>;
  inputLabel: string;
  /** `line` for fixed-shape identifiers (IBAN, ISBN); `block` for pasted text. */
  inputKind?: "line" | "block";
  inputPlaceholder?: string;
  rows?: number;
  initialValue?: string;
  /** Return null to stay idle — an empty box is not an error. */
  buildInput: (text: string) => Record<string, unknown> | null;
  renderResult: (output: TOutput) => ReactNode;
  /** Skeleton shown before the first keystroke — dashes, never a false verdict. */
  idle?: ReactNode;
  exit?: (output: TOutput) => ShellExit;
  /** Small option controls; own their state and pass a changing `optionsKey`. */
  options?: ReactNode;
  optionsKey?: string;
  sample?: string;
  note?: string;
  debounceMs?: number;
  largeInputChars?: number;
  manualAboveChars?: number;
  onTextChange?: (text: string) => void;
}

/**
 * Paste → live result, **no run button**. The button is a step tax when the
 * compute is trivial (§6.7.10). A run affordance appears only when the input
 * grows past the point where live recompute would stall the page.
 */
export function InstantTransformShell<TOutput>({
  engine,
  inputLabel,
  inputKind = "block",
  inputPlaceholder,
  rows = 8,
  initialValue = "",
  buildInput,
  renderResult,
  idle,
  exit,
  options,
  optionsKey = "",
  sample,
  note,
  debounceMs = 160,
  largeInputChars = DEFAULT_LARGE_INPUT,
  manualAboveChars = DEFAULT_MANUAL_ABOVE,
  onTextChange,
}: InstantTransformShellProps<TOutput>) {
  const t = useTranslations("runners");
  const uid = useId();
  const [text, setText] = useState(initialValue);
  const scale = useInputScale(text.length, largeInputChars, manualAboveChars, debounceMs);

  const { state, runNow } = useShellRun<TOutput>({
    engine,
    getInput: () => buildInput(text),
    deps: [text, optionsKey],
    auto: !scale.manual,
    debounceMs: scale.delay,
  });

  const update = (next: string) => {
    setText(next);
    onTextChange?.(next);
  };
  const onKeyDown = runShortcut(runNow);

  return (
    <div className="space-y-4">
      <div className={cx(PANEL, "space-y-3")}>
        {inputKind === "line" ? (
          <Input
            id={`${uid}-input`}
            label={inputLabel}
            value={text}
            placeholder={inputPlaceholder}
            onChange={(e) => update(e.target.value)}
            onKeyDown={onKeyDown}
            className="font-mono"
            spellCheck={false}
            autoComplete="off"
          />
        ) : (
          <Textarea
            id={`${uid}-input`}
            label={inputLabel}
            value={text}
            placeholder={inputPlaceholder}
            rows={rows}
            onChange={(e) => update(e.target.value)}
            onKeyDown={onKeyDown}
            className="font-mono text-sm"
            spellCheck={false}
          />
        )}
        {options ? <div className="flex flex-wrap items-end gap-3">{options}</div> : null}
        <div className="flex flex-wrap items-center gap-2">
          <CharCount text={text} />
          {sample !== undefined ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => update(sample)}>
              {t("shell.sample")}
            </Button>
          ) : null}
          {text ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => update("")}>
              {t("common.clear")}
            </Button>
          ) : null}
          {scale.manual ? (
            <Button type="button" variant="ink" size="sm" onClick={runNow}>
              {state.status === "running" ? t("common.running") : t("common.run")}
            </Button>
          ) : null}
        </div>
        {scale.large ? <ShellNote>{t("shell.largeInput")}</ShellNote> : null}
        {scale.manual ? <ShellNote>{t("shell.manualInput")}</ShellNote> : null}
      </div>

      <ShellStateView state={state} idle={idle}>
        {(output) => (
          <div className="space-y-3">
            {renderResult(output)}
            {exit ? <ShellExitActions exit={exit(output)} idPrefix={uid} /> : null}
          </div>
        )}
      </ShellStateView>

      <ShellNote>{note}</ShellNote>
    </div>
  );
}

/* ══ 2. Configure then generate ═════════════════════════════════════════ */

export interface ConfigureGenerateShellProps<TOutput> {
  engine: ShellEngine<TOutput>;
  /** The options controls — the tool owns their state. */
  children: ReactNode;
  /** Current option values. Return null when nothing is selected yet. */
  input: Record<string, unknown> | null;
  /** A specific instruction for the empty case ("Pick at least one stack above"). */
  emptyHint: string;
  renderResult: (output: TOutput) => ReactNode;
  exit?: (output: TOutput) => ShellExit;
  note?: string;
  debounceMs?: number;
  /** Optional no-op affordance for people who expect a button. Never required. */
  regenerateLabel?: string;
}

/**
 * The options *are* the product; the artifact regenerates as they change
 * (§6.7.10). Output is populated from the defaults on arrival — this shell
 * never opens on a blank panel with "click generate to see something".
 */
export function ConfigureGenerateShell<TOutput>({
  engine,
  children,
  input,
  emptyHint,
  renderResult,
  exit,
  note,
  debounceMs = 120,
  regenerateLabel,
}: ConfigureGenerateShellProps<TOutput>) {
  const t = useTranslations("runners");
  const uid = useId();
  const inputKey = useMemo(() => (input === null ? "" : stringifyJson(input)), [input]);
  const inputRef = useRef(input);
  inputRef.current = input;

  const { state, runNow } = useShellRun<TOutput>({
    engine,
    getInput: () => inputRef.current,
    deps: [inputKey],
    debounceMs,
  });

  return (
    <div className="space-y-4">
      <section className={cx(PANEL, "space-y-4")} aria-label={t("shell.options")}>
        {children}
        {regenerateLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={runNow}>
              {state.status === "running" ? t("common.running") : regenerateLabel}
            </Button>
            <ShellNote>{t("shell.regenerateNote")}</ShellNote>
          </div>
        ) : null}
      </section>

      <ShellStateView
        state={state}
        idle={<p className="text-sm text-[var(--neutral-11)]">{emptyHint}</p>}
      >
        {(output) => (
          <div className="space-y-3">
            {renderResult(output)}
            {exit ? <ShellExitActions exit={exit(output)} idPrefix={uid} /> : null}
          </div>
        )}
      </ShellStateView>

      <ShellNote>{note}</ShellNote>
    </div>
  );
}

/** One generated file among several (Dockerfile + .dockerignore + compose). */
export interface ShellArtifact {
  id: string;
  label: string;
  body: string;
  filename?: string;
  mimeType?: string;
}

/** Labelled panels for multi-file generators — never one concatenated blob. */
export function ShellArtifacts({ artifacts }: { artifacts: readonly ShellArtifact[] }) {
  const uid = useId();
  const [active, setActive] = useState(0);
  const current = artifacts[Math.min(active, artifacts.length - 1)];
  if (!current) return null;

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    setActive((i) => (i + delta + artifacts.length) % artifacts.length);
  };

  return (
    <div className="space-y-3">
      {artifacts.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {artifacts.map((a, i) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${a.id}`}
              aria-selected={i === active}
              aria-controls={`${uid}-panel-${a.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
              className={cx(
                "rounded-full px-3 py-1 font-mono text-xs transition-colors",
                i === active
                  ? "bg-[var(--blue-3)] text-[var(--neutral-12)]"
                  : "bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      <section id={`${uid}-panel-${current.id}`} aria-label={current.label} className="space-y-2">
        <ShellCode label={current.label}>{current.body}</ShellCode>
        <ShellExitActions
          exit={{
            text: current.body,
            filename: current.filename ?? current.label,
            ...(current.mimeType ? { mimeType: current.mimeType } : {}),
          }}
          idPrefix={`${uid}-${current.id}`}
        />
      </section>
    </div>
  );
}

/* ══ 3. Decision (scenario triage) ══════════════════════════════════════ */

export interface DecisionShellOption {
  id: string;
  label: string;
  detail?: string;
}

export interface DecisionShellProps {
  /** The question, asked once. No "step 1 of N" — triage is one move. */
  prompt: string;
  options: readonly DecisionShellOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** Revealed inline, at the same scroll position — never a new page. */
  children?: ReactNode;
  /** Small, non-gating escape hatches ("this isn't software"). */
  aside?: ReactNode;
}

/**
 * The user does not yet know what they want; the tool narrows by asking
 * (§6.7.10). One question, cards not a wizard, and the reveal lands directly
 * underneath so the follow-on generator stays on the same screen.
 */
export function DecisionShell({
  prompt,
  options,
  value,
  onChange,
  children,
  aside,
}: DecisionShellProps) {
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(index, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(index, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(-1, 1);
    } else if (e.key === "End") {
      e.preventDefault();
      move(0, -1);
    }
  };

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p id={`${uid}-prompt`} className="text-sm font-medium text-[var(--neutral-12)]">
          {prompt}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={`${uid}-prompt`}
          className="grid gap-2 sm:grid-cols-2"
        >
          {options.map((option, index) => {
            const selected = option.id === value;
            return (
              // biome-ignore lint/a11y/useSemanticElements: raw <input type="radio"> is banned in apps/** — button + radio role is the DS-compliant path
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={index === activeIndex ? 0 : -1}
                ref={(el) => {
                  refs.current[index] = el;
                }}
                onClick={() => onChange(option.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cx(
                  "rounded-[var(--radius-lg)] p-4 text-left transition-colors",
                  selected
                    ? "bg-[var(--blue-3)]"
                    : "bg-[var(--neutral-2)] hover:bg-[var(--neutral-3)]",
                )}
              >
                <span className="flex items-start gap-2">
                  {selected ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue-9)]" />
                  ) : null}
                  <span>
                    <span className="block text-sm font-medium text-[var(--neutral-12)]">
                      {option.label}
                    </span>
                    {option.detail ? (
                      <span className="mt-1 block text-xs text-[var(--neutral-11)]">
                        {option.detail}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {aside ? <div className={META}>{aside}</div> : null}
      </div>
      {value ? <div className="space-y-4">{children}</div> : null}
    </div>
  );
}

/* ══ 4. Drop and verdict ════════════════════════════════════════════════ */

export interface DropVerdictShellProps<TOutput> {
  engine: ShellEngine<TOutput>;
  /** An instruction, not a label — "Drop a file to identify it". */
  dropLabel: string;
  /** Stated at the point of action, per ship gate §6.5 #8. */
  privacyNote: string;
  accept?: string;
  /** Detectors read a bounded head sample; the shell reports when it truncated. */
  maxReadBytes?: number;
  paste?: { label: string; placeholder?: string; rows?: number; mode?: "always" | "tab" };
  /**
   * An explicit action button. `mode: "first"` (default) gates only the first
   * run and goes live afterwards — right when the compute is cheap but the
   * tool wants a deliberate start. `mode: "always"` keeps every run behind the
   * press, which is what a scanner wants: re-scanning on every keystroke of a
   * pasted repo file is both slow and a bad way to report secrets.
   */
  action?: { label: string; runningLabel?: string; mode?: "first" | "always" };
  buildInput: (source: ShellSource) => Record<string, unknown> | null;
  /** The one headline answer. Compose ShellVerdict inside this. */
  renderVerdict: (output: TOutput) => ReactNode;
  /** Everything else — the shell puts it behind a disclosure. */
  renderDetail?: (output: TOutput) => ReactNode;
  detailLabel?: string;
  idle?: ReactNode;
  exit?: (output: TOutput) => ShellExit;
  options?: ReactNode;
  optionsKey?: string;
  note?: string;
  debounceMs?: number;
}

/**
 * File (or paste) in → one clear answer, detail on demand (§6.7.10). Reading
 * is bounded so a huge drop is sampled rather than loaded, and the previous
 * verdict is replaced in place — the new input is the reset.
 */
export function DropVerdictShell<TOutput>({
  engine,
  dropLabel,
  privacyNote,
  accept,
  maxReadBytes = DEFAULT_READ_BYTES,
  paste,
  action,
  buildInput,
  renderVerdict,
  renderDetail,
  detailLabel,
  idle,
  exit,
  options,
  optionsKey = "",
  note,
  debounceMs = 200,
}: DropVerdictShellProps<TOutput>) {
  const t = useTranslations("runners");
  const uid = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [source, setSource] = useState<ShellSource | null>(null);
  const [sourceKey, setSourceKey] = useState("");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const gated = action?.mode === "always";
  const [acted, setActed] = useState(!action);
  const [readError, setReadError] = useState<string | null>(null);

  const sourceRef = useRef(source);
  sourceRef.current = source;

  const { state, runNow, reset } = useShellRun<TOutput>({
    engine,
    getInput: () => (sourceRef.current ? buildInput(sourceRef.current) : null),
    deps: [sourceKey, optionsKey],
    auto: acted && !gated,
    debounceMs,
  });

  // Gated mode does not re-run on its own, so a changed input would otherwise
  // sit under a verdict describing the *previous* one. Clear it: an unanswered
  // question is honest, a confidently wrong answer is not.
  // biome-ignore lint/correctness/useExhaustiveDependencies: new input, not a new renderer, is what invalidates the verdict
  useEffect(() => {
    if (gated) reset();
  }, [gated, sourceKey, optionsKey, reset]);

  const takeFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const next = await readFileSample(file, maxReadBytes);
        setReadError(null);
        setSource(next);
        setSourceKey(`file:${file.name}:${file.size}:${file.lastModified}`);
      } catch (err) {
        // A directory drop, a revoked permission or a file removed mid-read all
        // land here. Say so rather than leaving the last verdict on screen
        // looking like it describes the file the user just dropped.
        setSource(null);
        setSourceKey("");
        setReadError(err instanceof Error ? err.message : String(err));
      }
    },
    [maxReadBytes],
  );

  const takeText = (next: string) => {
    setText(next);
    setReadError(null);
    setSource(next ? { kind: "text", text: next } : null);
    setSourceKey(next ? `text:${next}` : "");
  };

  // In "first" mode the first press arms live mode (the effect schedules the
  // run) and later presses re-run immediately — never two invokes for one
  // press. In "always" mode nothing is armed, so every press runs once.
  const trigger = () => {
    if (gated || acted) runNow();
    else setActed(true);
  };

  const showPaste = paste && (paste.mode !== "tab" || tab === "paste");
  const showFile = !paste || paste.mode !== "tab" || tab === "file";

  return (
    <div className="space-y-4">
      {paste?.mode === "tab" ? (
        <div className="flex gap-1.5" role="tablist" aria-label={dropLabel}>
          {(["file", "paste"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${uid}-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`${uid}-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={cx(
                "rounded-full px-3 py-1 text-xs transition-colors",
                tab === id
                  ? "bg-[var(--blue-3)] text-[var(--neutral-12)]"
                  : "bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]",
              )}
            >
              {id === "file" ? t("shell.fileTab") : (paste?.label ?? t("shell.pasteTab"))}
            </button>
          ))}
        </div>
      ) : null}

      {showFile ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: drop target; the button inside carries keyboard + click
        <div
          id={`${uid}-panel-file`}
          {...(paste?.mode === "tab"
            ? { role: "tabpanel", "aria-labelledby": `${uid}-tab-file` }
            : {})}
          className={cx(
            "flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-6 text-center transition-colors",
            dragging ? "bg-[var(--blue-3)]" : "bg-[var(--neutral-2)]",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void takeFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <p className="text-sm text-[var(--neutral-11)]">{dropLabel}</p>
          <input
            data-allow-native
            ref={fileInput}
            type="file"
            accept={accept ?? "*/*"}
            className="sr-only"
            onChange={(e) => void takeFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            {t("shell.browse")}
          </Button>
          {source?.kind === "file" ? (
            <p className={META}>
              {t("shell.selectedFile", {
                name: source.name,
                kb: (source.size / 1024).toFixed(1),
              })}
            </p>
          ) : null}
          {source?.kind === "file" && source.truncated ? (
            <p className={META}>{t("shell.truncated", { kb: Math.round(maxReadBytes / 1024) })}</p>
          ) : null}
          <p className={META}>{privacyNote}</p>
        </div>
      ) : null}

      {readError ? <ShellError message={readError} /> : null}

      {showPaste && paste ? (
        <div
          id={`${uid}-panel-paste`}
          {...(paste.mode === "tab"
            ? { role: "tabpanel", "aria-labelledby": `${uid}-tab-paste` }
            : {})}
          className={cx(PANEL, "space-y-3")}
        >
          <Textarea
            id={`${uid}-paste`}
            label={paste.label}
            value={text}
            placeholder={paste.placeholder}
            rows={paste.rows ?? 8}
            onChange={(e) => takeText(e.target.value)}
            onKeyDown={runShortcut(trigger)}
            className="font-mono text-sm"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2">
            <CharCount text={text} />
            {text ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => takeText("")}>
                {t("common.clear")}
              </Button>
            ) : null}
          </div>
          {paste.mode !== "tab" ? <p className={META}>{privacyNote}</p> : null}
        </div>
      ) : null}

      {options ? <div className="flex flex-wrap items-end gap-3">{options}</div> : null}

      {action ? (
        <Button type="button" variant="ink" onClick={trigger} disabled={!source}>
          {state.status === "running" ? (action.runningLabel ?? t("common.running")) : action.label}
        </Button>
      ) : null}

      <ShellStateView state={state} idle={idle}>
        {(output) => (
          <div className="space-y-3">
            {renderVerdict(output)}
            {renderDetail ? (
              <ShellDrill summary={detailLabel ?? t("shell.detail")}>
                {renderDetail(output)}
              </ShellDrill>
            ) : null}
            {exit ? <ShellExitActions exit={exit(output)} idPrefix={uid} /> : null}
          </div>
        )}
      </ShellStateView>

      <ShellNote>{note}</ShellNote>
    </div>
  );
}

/* ══ 5. Two-pane compare ════════════════════════════════════════════════ */

export interface ShellChange {
  id?: string;
  /** Key path, line reference or item — whatever identifies the change. */
  path: string;
  /** `added` | `removed` | `changed` | `type` | anything the tool defines. */
  kind: string;
  before?: string;
  after?: string;
  note?: string;
}

export function changeKindTone(kind: string): ShellTone {
  const k = kind.toLowerCase();
  if (k.startsWith("add")) return "success";
  if (k.startsWith("remove") || k.startsWith("delete") || k.startsWith("missing")) return "danger";
  if (k.startsWith("type")) return "info";
  if (k.startsWith("chang") || k.startsWith("modif") || k.startsWith("value")) return "warning";
  return "neutral";
}

export interface TwoPaneCompareShellProps<TOutput> {
  engine: ShellEngine<TOutput>;
  leftLabel: string;
  rightLabel: string;
  leftPlaceholder?: string;
  rightPlaceholder?: string;
  rows?: number;
  sample?: { left: string; right: string };
  options?: ReactNode;
  optionsKey?: string;
  /** Return null while either side is empty — never a false "no differences". */
  buildInput: (left: string, right: string) => Record<string, unknown> | null;
  /**
   * Per-pane live validity badge (parse ok / parse error at line N). Called on
   * every render with the full pane text, so it must be cheap — memoize the
   * parse in the tool if it is not.
   */
  paneStatus?: (text: string, side: "left" | "right") => { tone: ShellTone; label: string } | null;
  /** The one-line answer above the change list. */
  summary?: (output: TOutput) => { tone: ShellTone; headline: string };
  /**
   * Supply this to get the navigable change table for free. It must be a cheap
   * projection of an already-computed `output` — do not diff in here; the diff
   * belongs in `engine`, which runs once per input change rather than per render.
   */
  changes?: (output: TOutput) => readonly ShellChange[];
  /** Anything the change table cannot express (set panels, unified view). */
  renderResult?: (output: TOutput) => ReactNode;
  emptyHint: string;
  exit?: (output: TOutput) => ShellExit;
  note?: string;
  debounceMs?: number;
  largeInputChars?: number;
  manualAboveChars?: number;
}

/**
 * Side-by-side inputs, one synchronized structured result (§6.7.10). Diff runs
 * live once both panes hold content — no Compare button gating it — and the
 * change list is navigable by button or Alt+Arrow so a long diff is walkable.
 */
export function TwoPaneCompareShell<TOutput>({
  engine,
  leftLabel,
  rightLabel,
  leftPlaceholder,
  rightPlaceholder,
  rows = 12,
  sample,
  options,
  optionsKey = "",
  buildInput,
  paneStatus,
  summary,
  changes,
  renderResult,
  emptyHint,
  exit,
  note,
  debounceMs = 200,
  largeInputChars = DEFAULT_LARGE_INPUT,
  manualAboveChars = DEFAULT_MANUAL_ABOVE,
}: TwoPaneCompareShellProps<TOutput>) {
  const t = useTranslations("runners");
  const uid = useId();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const scale = useInputScale(
    left.length + right.length,
    largeInputChars,
    manualAboveChars,
    debounceMs,
  );

  const { state, runNow } = useShellRun<TOutput>({
    engine,
    getInput: () => buildInput(left, right),
    deps: [left, right, optionsKey],
    auto: !scale.manual,
    debounceMs: scale.delay,
  });

  // Row count is read back from the render pass — the change list belongs to
  // the rendered output, so it must not be derived from `changes` identity
  // (an inline arrow would rebuild it every render and fight the cursor).
  const rowCount = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new inputs mean a new diff — cursor back to the top
  useEffect(() => {
    setActive(0);
  }, [left, right, optionsKey]);

  useEffect(() => {
    rowRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const step = (delta: number) => {
    const total = rowCount.current;
    if (total === 0) return;
    setActive((i) => (i + delta + total) % total);
  };

  const onResultKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!e.altKey) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    }
  };

  const pane = (side: "left" | "right") => {
    const text = side === "left" ? left : right;
    const set = side === "left" ? setLeft : setRight;
    const label = side === "left" ? leftLabel : rightLabel;
    const status = paneStatus?.(text, side) ?? null;
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drop target around a real textarea
      <div
        className={cx(PANEL, "space-y-2")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) void file.text().then((value) => set(value));
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--neutral-11)]">{label}</span>
          {status ? <ShellBadge tone={status.tone}>{status.label}</ShellBadge> : null}
        </div>
        <Textarea
          id={`${uid}-${side}`}
          aria-label={label}
          value={text}
          placeholder={side === "left" ? leftPlaceholder : rightPlaceholder}
          rows={rows}
          onChange={(e) => set(e.target.value)}
          onKeyDown={runShortcut(runNow)}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          <CharCount text={text} />
          {text ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => set("")}>
              {t("common.clear")}
            </Button>
          ) : null}
          <span className={META}>{t("shell.dropIntoPane")}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {pane("left")}
        {pane("right")}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setLeft(right);
            setRight(left);
          }}
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t("shell.swap")}
        </Button>
        {sample ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setLeft(sample.left);
              setRight(sample.right);
            }}
          >
            {t("shell.sample")}
          </Button>
        ) : null}
        {scale.manual ? (
          <Button type="button" variant="ink" size="sm" onClick={runNow}>
            {state.status === "running" ? t("common.running") : t("common.run")}
          </Button>
        ) : null}
        {options}
      </div>
      {scale.large ? <ShellNote>{t("shell.largeInput")}</ShellNote> : null}
      {scale.manual ? <ShellNote>{t("shell.manualInput")}</ShellNote> : null}

      {/* Alt+ArrowUp / Alt+ArrowDown walk the change list; the handler sits on the
          region so it fires from whichever control inside currently has focus. */}
      <section aria-label={t("shell.result")} onKeyDown={onResultKeyDown} className="space-y-3">
        <ShellStateView
          state={state}
          idle={<p className="text-sm text-[var(--neutral-11)]">{emptyHint}</p>}
        >
          {(output) => {
            const head = summary?.(output);
            const list = changes?.(output) ?? [];
            rowCount.current = list.length;
            const cursor = list.length > 0 ? Math.min(active, list.length - 1) : 0;
            return (
              <div className="space-y-3">
                {head ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ShellBadge tone={head.tone}>{head.headline}</ShellBadge>
                    {list.length > 1 ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => step(-1)}>
                          <ArrowUp className="h-4 w-4" />
                          {t("shell.prevChange")}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => step(1)}>
                          <ArrowDown className="h-4 w-4" />
                          {t("shell.nextChange")}
                        </Button>
                        <span className={META}>
                          {t("shell.changePosition", { index: cursor + 1, total: list.length })}
                        </span>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {list.length > 0 ? (
                  <ol className="max-h-[28rem] space-y-1 overflow-y-auto">
                    {list.map((change, i) => (
                      <li
                        key={change.id ?? `${change.path}-${i}`}
                        ref={(el) => {
                          rowRefs.current[i] = el;
                        }}
                        aria-current={i === cursor ? "true" : undefined}
                        className={cx(
                          "rounded-[var(--radius-md)] p-2 transition-opacity",
                          TONE_BG[changeKindTone(change.kind)],
                          i === cursor ? "" : "opacity-70",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {i === cursor ? (
                            <ArrowRight
                              className="h-3.5 w-3.5 shrink-0 text-[var(--neutral-11)]"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className="font-mono text-xs text-[var(--neutral-12)]">
                            {change.path}
                          </span>
                          <ShellBadge tone={changeKindTone(change.kind)}>{change.kind}</ShellBadge>
                        </div>
                        {change.before !== undefined || change.after !== undefined ? (
                          <div className="mt-1 grid gap-1 overflow-x-auto font-mono text-xs text-[var(--neutral-11)] sm:grid-cols-2">
                            <span>{change.before ?? "—"}</span>
                            <span>{change.after ?? "—"}</span>
                          </div>
                        ) : null}
                        {change.note ? <p className={META}>{change.note}</p> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}

                {renderResult?.(output)}
                {exit ? <ShellExitActions exit={exit(output)} idPrefix={uid} /> : null}
              </div>
            );
          }}
        </ShellStateView>
      </section>

      <ShellNote>{note}</ShellNote>
    </div>
  );
}
