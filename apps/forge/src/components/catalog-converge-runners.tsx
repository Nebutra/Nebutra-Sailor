"use client";
// @brand-exempt: seed values and sample text for the tools themselves — a colour picker, a text runner; the literal is input the user edits, never a painted surface

/**
 * High-quality convergence for remaining catalog-only tools.
 * Patterns: live calculators, WCAG/verdict banners, structured tables,
 * generators with copy+download — no raw JSON walls.
 */
import { Button, DatePicker, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  InstantTransformShell,
  ShellBadge,
  ShellNote,
  type ShellTone,
  ShellVerdict,
  TwoPaneCompareShell,
} from "@/components/journey-shells";
import {
  invokeForge,
  MetaCards,
  TextResultActions,
  useDebouncedCallback,
} from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerPanel, RunnerSelect } from "@/components/runner-ui";

/* ── tiny live form helper ──────────────────────────────────────────────── */

function useLiveInvoke(
  toolId: string,
  build: () => Record<string, unknown> | null,
  deps: unknown[],
  debounceMs = 280,
) {
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const input = build();
    if (!input) {
      setOut(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, input);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const live = useDebouncedCallback(() => {
    void run();
  }, debounceMs);

  useEffect(() => {
    live();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { out, error, loading, run };
}

/* ── Color contrast (WCAG) ──────────────────────────────────────────────── */

export function ColorContrastRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  // @allow-brand-hex: seed value for a contrast checker — the brand pair is the obvious thing to check first; the user edits it and it never paints chrome
  const [fg, setFg] = useState("#0033FE");
  const [bg, setBg] = useState("#ffffff");
  const { out, error, loading } = useLiveInvoke(
    toolId,
    () => ({ foreground: fg, background: bg }),
    [fg, bg],
    200,
  );

  const ratio = typeof out?.ratio === "number" ? out.ratio : null;
  const allPass =
    out?.aaNormal === true && out?.aaaNormal === true
      ? "success"
      : out?.aaNormal === true
        ? "warning"
        : out
          ? "danger"
          : "neutral";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label={t("contrast.fg")}
            id="cc-fg"
            value={fg}
            onChange={(e) => setFg(e.target.value)}
            className="font-mono min-w-[8rem]"
          />
          <input
            data-allow-native
            type="color"
            aria-label={t("contrast.fg")}
            // @allow-brand-hex: fallback for the same seeded input when the typed hex is incomplete
            value={/^#[0-9a-fA-F]{6}$/.test(fg) ? fg : "#0033FE"}
            onChange={(e) => setFg(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border border-[var(--neutral-7)] bg-transparent p-1"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label={t("contrast.bg")}
            id="cc-bg"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="font-mono min-w-[8rem]"
          />
          <input
            data-allow-native
            type="color"
            aria-label={t("contrast.bg")}
            value={/^#[0-9a-fA-F]{6}$/.test(bg) ? bg : "#ffffff"}
            onChange={(e) => setBg(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border border-[var(--neutral-7)] bg-transparent p-1"
          />
        </div>
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
            <div
              className="flex min-h-[8rem] flex-col justify-center rounded-[var(--radius-lg)] p-6 text-center shadow-ambient-sm ring-1 ring-inset ring-[var(--neutral-6)]"
              style={{ color: fg, background: bg }}
            >
              <p className="text-lg font-semibold leading-snug">{t("contrast.sampleHeadline")}</p>
              <p className="mt-2 font-mono text-sm opacity-90">
                {String(out.ratioLabel ?? `${ratio}:1`)}
              </p>
            </div>
            <div className="flex gap-2 sm:flex-col sm:justify-center">
              <div
                className="h-14 w-14 shrink-0 rounded-[var(--radius-md)] ring-1 ring-inset ring-[var(--neutral-6)] sm:h-16 sm:w-16"
                style={{ background: fg }}
                title={fg}
                aria-label={t("contrast.fg")}
              />
              <div
                className="h-14 w-14 shrink-0 rounded-[var(--radius-md)] ring-1 ring-inset ring-[var(--neutral-6)] sm:h-16 sm:w-16"
                style={{ background: bg }}
                title={bg}
                aria-label={t("contrast.bg")}
              />
            </div>
          </div>
          <ShellVerdict
            tone={allPass as ShellTone}
            headline={String(out.ratioLabel ?? "—")}
            badges={
              <>
                <ShellBadge tone={out.aaNormal ? "success" : "danger"}>
                  {t("contrast.aaNormal")} {out.aaNormal ? t("contrast.pass") : t("contrast.fail")}
                </ShellBadge>
                <ShellBadge tone={out.aaLarge ? "success" : "danger"}>
                  {t("contrast.aaLarge")} {out.aaLarge ? t("contrast.pass") : t("contrast.fail")}
                </ShellBadge>
                <ShellBadge tone={out.aaaNormal ? "success" : "danger"}>
                  {t("contrast.aaaNormal")}{" "}
                  {out.aaaNormal ? t("contrast.pass") : t("contrast.fail")}
                </ShellBadge>
                <ShellBadge tone={out.aaaLarge ? "success" : "danger"}>
                  {t("contrast.aaaLarge")} {out.aaaLarge ? t("contrast.pass") : t("contrast.fail")}
                </ShellBadge>
              </>
            }
          />
        </div>
      ) : null}
      <RunnerNote>{t("contrast.note")}</RunnerNote>
    </div>
  );
}

/* ── Life calculators ───────────────────────────────────────────────────── */

export function AgeCalculatorRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [birthDate, setBirth] = useState("1990-01-15");
  const [asOf, setAsOf] = useState("");
  const { out, error, loading } = useLiveInvoke(toolId, () => {
    if (!birthDate.trim()) return null;
    return asOf.trim() ? { birthDate, asOf } : { birthDate };
  }, [birthDate, asOf]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DatePicker
          label={t("age.birthDate")}
          id="age-birth"
          value={birthDate}
          onValueChange={setBirth}
        />
        <DatePicker label={t("age.asOf")} id="age-asof" value={asOf} onValueChange={setAsOf} />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums">{String(out.human ?? "—")}</p>
          <div className="mt-3">
            <MetaCards
              items={[
                { label: "years", value: String(out.years ?? "—") },
                { label: "months", value: String(out.months ?? "—") },
                { label: "days", value: String(out.days ?? "—") },
                { label: "total days", value: String(out.totalDays ?? "—") },
              ]}
            />
          </div>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("age.note")}</RunnerNote>
    </div>
  );
}

export function TipCalculatorRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [bill, setBill] = useState("100");
  const [tipPercent, setTip] = useState("15");
  const [people, setPeople] = useState("2");
  const { out, error, loading } = useLiveInvoke(toolId, () => {
    const b = Number(bill);
    if (!Number.isFinite(b) || b <= 0) return null;
    return { bill: b, tipPercent: Number(tipPercent) || 0, people: Number(people) || 1 };
  }, [bill, tipPercent, people]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={t("tip.bill")}
          id="tip-bill"
          type="number"
          value={bill}
          onChange={(e) => setBill(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("tip.percent")}
          id="tip-pct"
          type="number"
          value={tipPercent}
          onChange={(e) => setTip(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("tip.people")}
          id="tip-people"
          type="number"
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          className="font-mono"
        />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <MetaCards
          items={[
            { label: "tip", value: String(out.tip ?? "—") },
            { label: "total", value: String(out.total ?? "—") },
            { label: "per person", value: String(out.perPerson ?? "—") },
          ]}
        />
      ) : null}
      <RunnerNote>{t("tip.note")}</RunnerNote>
    </div>
  );
}

export function AspectRatioRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [width, setW] = useState("1920");
  const [height, setH] = useState("1080");
  const { out, error, loading } = useLiveInvoke(toolId, () => {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    return { width: w, height: h };
  }, [width, height]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Width"
          id="ar-w"
          type="number"
          value={width}
          onChange={(e) => setW(e.target.value)}
          className="font-mono"
        />
        <Input
          label="Height"
          id="ar-h"
          type="number"
          value={height}
          onChange={(e) => setH(e.target.value)}
          className="font-mono"
        />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums">{String(out.ratio ?? "—")}</p>
          <div className="mt-3">
            <MetaCards
              items={[
                { label: "width", value: String(out.width ?? "—") },
                { label: "height", value: String(out.height ?? "—") },
                { label: "decimal", value: String(out.decimal ?? "—") },
              ]}
            />
          </div>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("aspect.note")}</RunnerNote>
    </div>
  );
}

export function PercentageChangeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [from, setFrom] = useState("100");
  const [to, setTo] = useState("120");
  const { out, error, loading } = useLiveInvoke(toolId, () => {
    const a = Number(from);
    const b = Number(to);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { from: a, to: b };
  }, [from, to]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="From"
          id="pc-from"
          type="number"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="font-mono"
        />
        <Input
          label="To"
          id="pc-to"
          type="number"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="font-mono"
        />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums">
            {typeof out.percent === "number" ? `${out.percent}%` : String(out.percent ?? "—")}
            {out.direction ? ` · ${String(out.direction)}` : ""}
          </p>
          <MetaCards
            items={[
              { label: "from", value: String(out.from ?? "—") },
              { label: "to", value: String(out.to ?? "—") },
              { label: "change", value: String(out.change ?? "—") },
            ]}
          />
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

/* ── Text analytics ─────────────────────────────────────────────────────── */

export function CountCharsRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("Hello Nebutra 你好世界");
  const { out, error, loading } = useLiveInvoke(toolId, () => ({ text }), [text], 160);

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="count-chars"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <MetaCards
          items={[
            { label: "characters", value: String(out.characters ?? "—") },
            { label: "no spaces", value: String(out.charactersNoSpaces ?? "—") },
            { label: "bytes (utf8)", value: String(out.bytesUtf8 ?? "—") },
            { label: "lines", value: String(out.lines ?? "—") },
            { label: "whitespace", value: String(out.whitespace ?? "—") },
          ]}
        />
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function WordFrequencyRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("hello world hello forge 工具 工具 站");
  const [top, setTop] = useState("20");
  const { out, error, loading } = useLiveInvoke(
    toolId,
    () => (text.trim() ? { text, top: Number(top) || 20 } : null),
    [text, top],
  );
  const ranked = Array.isArray(out?.top)
    ? (out.top as Array<{ token: string; count: number }>)
    : [];

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="wf-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <Input
        label={t("wordFreq.top")}
        id="wf-top"
        type="number"
        value={top}
        onChange={(e) => setTop(e.target.value)}
        className="max-w-xs font-mono"
      />
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? <ShellBadge tone="info">unique {String(out.totalUnique ?? "—")}</ShellBadge> : null}
      {ranked.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--neutral-10)]">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">token</th>
                <th className="px-3 py-2">count</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, i) => (
                <tr
                  key={`${row.token}-${i}`}
                  className={i % 2 === 1 ? "bg-[var(--neutral-3)]" : undefined}
                >
                  <td className="px-3 py-1.5 tabular-nums text-[var(--neutral-11)]">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-[var(--neutral-12)]">{row.token}</td>
                  <td className="px-3 py-1.5 tabular-nums font-medium">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {ranked.length > 0 ? (
        <TextResultActions
          text={ranked.map((r) => `${r.token}\t${r.count}`).join("\n")}
          downloadName="word-frequency.tsv"
          contentType="text/tab-separated-values"
        />
      ) : null}
      <RunnerNote>{t("wordFreq.note")}</RunnerNote>
    </div>
  );
}

export function FindReplaceRegexRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("foo bar foo baz");
  const [pattern, setPattern] = useState("foo");
  const [replacement, setReplacement] = useState("baz");
  const [flags, setFlags] = useState("g");
  const { out, error, loading } = useLiveInvoke(
    toolId,
    () => (text.length && pattern ? { text, pattern, replacement, flags } : null),
    [text, pattern, replacement, flags],
    320,
  );
  const result = typeof out?.result === "string" ? out.result : "";

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="fr-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={t("regex.pattern")}
          id="fr-pat"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("regex.replacement")}
          id="fr-rep"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("regex.flags")}
          id="fr-flags"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          className="font-mono"
        />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
        {out?.matches != null ? ` · matches ${String(out.matches)}` : ""}
      </p>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <>
          <TextResultActions text={result} downloadName="replaced.txt" />
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-sm">
            {result}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("regex.note")}</RunnerNote>
    </div>
  );
}

export function StringSimilarityRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <TwoPaneCompareShell<{
      distance: number;
      similarity: number;
      percent: string;
      lengthA: number;
      lengthB: number;
    }>
      engine={{ toolId }}
      leftLabel="A"
      rightLabel="B"
      emptyHint={t("common.liveHint")}
      sample={{ left: "kitten", right: "sitting" }}
      buildInput={(a, b) => (a.length || b.length ? { a, b } : null)}
      note={t("stringSimilarity.note")}
      summary={(o) => ({
        tone: o.similarity >= 80 ? "success" : o.similarity >= 50 ? "warning" : "danger",
        headline: o.percent,
      })}
      renderResult={(o) => (
        <MetaCards
          items={[
            { label: "similarity", value: o.percent },
            { label: "distance", value: String(o.distance) },
            { label: "len A", value: String(o.lengthA) },
            { label: "len B", value: String(o.lengthB) },
          ]}
        />
      )}
    />
  );
}

/* ── Lookup / parse ─────────────────────────────────────────────────────── */

export function MimeLookupRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <InstantTransformShell<{
      results: Array<{ input: string; extension: string; mime: string | null; known: boolean }>;
      knownCount: number;
      unknownCount: number;
    }>
      engine={{ toolId }}
      inputKind="block"
      inputLabel={t("common.text")}
      inputPlaceholder={"png\n.json\nfile.tsx"}
      sample={"png\njson\nunknown-ext"}
      rows={5}
      note={t("mime.note")}
      buildInput={(text) => (text.trim() ? { text } : null)}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(o) => ({
        text: o.results.map((r) => `${r.input}\t${r.mime ?? "unknown"}`).join("\n"),
        filename: "mime-lookup.tsv",
      })}
      renderResult={(o) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <ShellBadge tone="success">known {o.knownCount}</ShellBadge>
            <ShellBadge tone={o.unknownCount ? "warning" : "neutral"}>
              unknown {o.unknownCount}
            </ShellBadge>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
            <table className="w-full text-left text-sm">
              <tbody>
                {o.results.map((r, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-[var(--neutral-3)]" : undefined}>
                    <td className="px-3 py-2 font-mono">{r.input}</td>
                    <td className="px-3 py-2 font-mono text-[var(--neutral-11)]">.{r.extension}</td>
                    <td className="px-3 py-2 font-mono">
                      {r.known ? (
                        r.mime
                      ) : (
                        <span className="text-[var(--status-warning)]">unknown</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}

export function UserAgentParseRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );
  const { out, error, loading, run } = useLiveInvoke(
    toolId,
    () => (text.trim() ? { text } : null),
    [text],
    400,
  );

  return (
    <div className="space-y-4">
      <Textarea
        label="User-Agent"
        id="ua-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void run()}
          disabled={loading}
        >
          {loading ? t("common.running") : t("common.run")}
        </Button>
        <span className="text-xs text-[var(--neutral-10)]">{t("common.liveHint")}</span>
      </div>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="space-y-3">
          {out.isBot ? (
            <ShellBadge tone="warning">bot</ShellBadge>
          ) : (
            <ShellBadge tone="info">{String(out.device)}</ShellBadge>
          )}
          <MetaCards
            items={[
              {
                label: "browser",
                value: `${String(out.browser ?? "")} ${String(out.browserVersion ?? "")}`.trim(),
              },
              {
                label: "engine",
                value: `${String(out.engine ?? "")} ${String(out.engineVersion ?? "")}`.trim(),
              },
              { label: "os", value: String(out.os ?? "—") },
              { label: "device", value: String(out.device ?? "—") },
              { label: "vendor", value: String(out.deviceVendor ?? "—") },
              { label: "model", value: String(out.deviceModel ?? "—") },
              { label: "cpu", value: String(out.cpu ?? "—") },
              { label: "parser", value: String(out.parser ?? "—") },
            ]}
          />
        </div>
      ) : null}
      <RunnerNote>{t("ua.note")}</RunnerNote>
    </div>
  );
}

export function RomanNumeralsRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <InstantTransformShell<{ result?: string; value?: string | number; mode?: string }>
      engine={{ toolId }}
      inputKind="line"
      inputLabel={t("common.text")}
      sample="2026"
      inputPlaceholder="2026 or MMXXVI"
      note={t("roman.note")}
      buildInput={(text) => (text.trim() ? { text } : null)}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(o) => ({ text: String(o.result ?? o.value ?? ""), filename: "roman.txt" })}
      renderResult={(o) => (
        <RunnerPanel>
          <p className="font-mono text-3xl font-bold tabular-nums">
            {String(o.result ?? o.value ?? "—")}
          </p>
        </RunnerPanel>
      )}
    />
  );
}

export function EpochConvertRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [value, setValue] = useState(String(Date.now()));
  const [mode, setMode] = useState("ms_to_iso");
  const { out, error, loading } = useLiveInvoke(
    toolId,
    () => (value.trim() ? { value, mode } : null),
    [value, mode],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("common.input")}
          id="epoch-v"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono"
        />
        <RunnerSelect id="epoch-mode" label={t("common.mode")} value={mode} onChange={setMode}>
          <option value="ms_to_iso">ms → ISO</option>
          <option value="iso_to_ms">ISO → ms</option>
        </RunnerSelect>
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="break-all font-mono text-xl font-semibold">{String(out.result ?? "—")}</p>
          {out.ms != null ? (
            <p className="mt-1 font-mono text-xs text-[var(--neutral-10)]">ms {String(out.ms)}</p>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function HexRgbRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  // @allow-brand-hex: seed text for a colour-parsing runner; it is the tool's input, not a surface
  const [text, setText] = useState("#0033FE");
  const [mode, setMode] = useState("hex_to_rgb");
  const { out, error, loading } = useLiveInvoke(
    toolId,
    () => (text.trim() ? { text, mode } : null),
    [text, mode],
    200,
  );
  const swatch =
    typeof out?.hex === "string"
      ? out.hex
      : mode === "hex_to_rgb" && /^#[0-9a-fA-F]{3,8}$/.test(text)
        ? text
        : typeof out?.result === "string" && String(out.result).startsWith("#")
          ? String(out.result)
          : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("common.text")}
          id="hexrgb"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono"
        />
        <RunnerSelect id="hexrgb-mode" label={t("common.mode")} value={mode} onChange={setMode}>
          <option value="hex_to_rgb">HEX → RGB</option>
          <option value="rgb_to_hex">RGB → HEX</option>
        </RunnerSelect>
      </div>
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="flex flex-wrap items-center gap-4">
          {swatch ? (
            <div
              className="h-16 w-16 rounded-lg border border-[var(--neutral-6)]"
              style={{ background: String(swatch) }}
            />
          ) : null}
          <pre className="font-mono text-sm">{JSON.stringify(out, null, 2)}</pre>
        </div>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function UrlParseRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <InstantTransformShell<Record<string, unknown>>
      engine={{ toolId }}
      inputKind="line"
      inputLabel="URL"
      sample="https://nebutra.com:443/docs?x=1#top"
      note={t("common.sameAsApi")}
      buildInput={(text) => (text.trim() ? { text } : null)}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      renderResult={(o) => (
        <MetaCards
          items={Object.entries(o)
            .filter(([, v]) => v !== null && typeof v !== "object")
            .map(([k, v]) => ({ label: k, value: String(v) }))}
        />
      )}
    />
  );
}

/* ── Generators / security ──────────────────────────────────────────────── */

export function RandomNumberRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [count, setCount] = useState("5");
  const [numbers, setNumbers] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {
      min: Number(min),
      max: Number(max),
      count: Number(count) || 1,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setNumbers(Array.isArray(r.output.numbers) ? (r.output.numbers as number[]) : []);
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = numbers.join("\n");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={t("rand.min")}
          id="rn-min"
          type="number"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <Input
          label={t("rand.max")}
          id="rn-max"
          type="number"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
        <Input
          label={t("rand.count")}
          id="rn-count"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {text ? (
        <>
          <TextResultActions text={text} downloadName="random-numbers.txt" />
          <p className="font-mono text-2xl tabular-nums tracking-wide">{numbers.join(" · ")}</p>
        </>
      ) : null}
      <RunnerNote>{t("rand.note")}</RunnerNote>
    </div>
  );
}

export function DiceRollRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [sides, setSides] = useState("6");
  const [count, setCount] = useState("2");
  const [rolls, setRolls] = useState<number[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { sides: Number(sides) || 6, count: Number(count) || 1 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setRolls(Array.isArray(r.output.rolls) ? (r.output.rolls as number[]) : []);
    setTotal(typeof r.output.total === "number" ? r.output.total : null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("dice.sides")}
          id="dice-sides"
          type="number"
          value={sides}
          onChange={(e) => setSides(e.target.value)}
        />
        <Input
          label={t("dice.count")}
          id="dice-count"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {rolls.length > 0 ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums tracking-widest">{rolls.join(" · ")}</p>
          {total != null ? (
            <p className="mt-2 text-sm text-[var(--neutral-11)]">total {total}</p>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("dice.note")}</RunnerNote>
    </div>
  );
}

export function JwtGenerateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [payload, setPayload] = useState('{\n  "sub": "user_1",\n  "role": "admin"\n}');
  const [secret, setSecret] = useState("dev-secret-change-me");
  const [expiresInSec, setExp] = useState("3600");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {
      payload,
      secret,
      expiresInSec: Number(expiresInSec) || 0,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setToken(String(r.output.token ?? ""));
  };

  return (
    <div className="space-y-4">
      <Textarea
        label={t("jwt.payload")}
        id="jwt-payload"
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("jwt.secret")}
          id="jwt-secret"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("jwt.exp")}
          id="jwt-exp"
          type="number"
          value={expiresInSec}
          onChange={(e) => setExp(e.target.value)}
          className="font-mono"
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {token ? (
        <>
          <TextResultActions text={token} downloadName="token.jwt" />
          <pre className="overflow-x-auto break-all rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs">
            {token}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("jwt.note")}</RunnerNote>
    </div>
  );
}

export function HmacVerifyRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [message, setMessage] = useState("hello");
  const [secret, setSecret] = useState("secret");
  const [signature, setSignature] = useState("");
  const [encoding, setEncoding] = useState("hex");
  const { out, error, loading } = useLiveInvoke(
    toolId,
    () => (message && secret && signature.trim() ? { message, secret, signature, encoding } : null),
    [message, secret, signature, encoding],
  );
  const valid = out?.valid === true || out?.match === true || out?.equal === true;

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.message")}
        id="hv-msg"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="font-mono text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("common.secret")}
          id="hv-secret"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="font-mono"
        />
        <RunnerSelect
          id="hv-enc"
          label={t("common.encoding")}
          value={encoding}
          onChange={setEncoding}
        >
          <option value="hex">hex</option>
          <option value="base64">base64</option>
          <option value="base64url">base64url</option>
        </RunnerSelect>
      </div>
      <Input
        label="Signature"
        id="hv-sig"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        className="font-mono"
        placeholder="paste expected HMAC"
      />
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <ShellVerdict
          tone={valid ? "success" : "danger"}
          headline={valid ? t("validate.match") : t("validate.mismatch")}
          badges={
            typeof out.expected === "string" ? (
              <ShellBadge tone="info">expected ready</ShellBadge>
            ) : null
          }
        />
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function SecretGenerateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [bytes, setBytes] = useState("32");
  const [encoding, setEncoding] = useState("hex");
  const [count, setCount] = useState("1");
  const [secrets, setSecrets] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {
      bytes: Number(bytes) || 32,
      encoding,
      count: Number(count) || 1,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSecrets(Array.isArray(r.output.secrets) ? (r.output.secrets as string[]) : []);
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = secrets.join("\n");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Bytes"
          id="sg-bytes"
          type="number"
          value={bytes}
          onChange={(e) => setBytes(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("randomString.count")}
          id="sg-count"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="font-mono"
        />
        <RunnerSelect
          id="sg-enc"
          label={t("common.encoding")}
          value={encoding}
          onChange={setEncoding}
        >
          <option value="hex">hex</option>
          <option value="base64">base64</option>
          <option value="base64url">base64url</option>
        </RunnerSelect>
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {text ? (
        <>
          <TextResultActions text={text} downloadName="secrets.txt" />
          <pre className="max-h-80 overflow-auto break-all rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-sm">
            {text}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function ChecksumTextRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("Nebutra Forge");
  const { out, error, loading } = useLiveInvoke(toolId, () => (text ? { text } : null), [text]);

  const lines = out
    ? Object.entries(out)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join("\n")
    : "";

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="ck-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="font-mono text-sm"
      />
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <>
          <MetaCards
            items={Object.entries(out)
              .filter(([, v]) => typeof v === "string" || typeof v === "number")
              .map(([k, v]) => ({ label: k, value: String(v) }))}
          />
          {lines ? <TextResultActions text={lines} downloadName="checksums.txt" /> : null}
        </>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function WeekdayRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { out, error, loading } = useLiveInvoke(toolId, () => (date ? { date } : null), [date]);

  return (
    <div className="space-y-4">
      <DatePicker label="Date" id="wd-date" value={date} onValueChange={setDate} />
      <p className="text-xs text-[var(--neutral-10)]">
        {loading ? t("common.running") : t("common.liveHint")}
      </p>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="text-3xl font-bold">
            {String(out.weekday ?? out.result ?? out.name ?? "—")}
          </p>
          <MetaCards
            items={Object.entries(out)
              .filter(([, v]) => typeof v !== "object")
              .slice(0, 6)
              .map(([k, v]) => ({ label: k, value: String(v) }))}
          />
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}

export function LoremWordsRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [count, setCount] = useState("40");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { count: Number(count) || 40 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(String(r.output.result ?? r.output.text ?? ""));
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Input
        label="Count"
        id="lw-count"
        type="number"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        className="max-w-xs font-mono"
      />
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <>
          <TextResultActions text={result} downloadName="lorem-words.txt" />
          <p className="leading-relaxed text-[var(--neutral-12)]">{result}</p>
        </>
      ) : null}
      <RunnerNote>{t("common.sameAsApi")}</RunnerNote>
    </div>
  );
}
