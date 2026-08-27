// @brand-exempt: every literal here is SAMPLE INPUT for a tool — a demo SVG the optimiser
// operates on, demo text for the case/word-count runners, a demo URL for the QR runner. The
// point of sample input is that it is arbitrary; routing it through brand.metadata would make
// the demo describe the brand instead of exercising the tool.

"use client";

/**
 * SOTA-oriented specialized runners: regex highlight, QR live preview, multi-hash.
 */
import { ArrowDown, Check, Copy } from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fileToBase64, PdfResultPanel, TextResultActions } from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerOutput, RunnerSelect } from "@/components/runner-ui";

async function invokeTool(
  toolId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; message: string }> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, output: body.output ?? {} };
}

// ─── Regex with match highlight ─────────────────────────────────────────────

export function RegexSotaRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [pattern, setPattern] = useState("\\b[A-Z][a-z]+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Hello Nebutra World — Forge Tools");
  const [mode, setMode] = useState<"match" | "replace" | "test">("match");
  const [replacement, setReplacement] = useState("[$&]");
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Array<{ match: string; index: number; groups: string[] }>>(
    [],
  );
  const [replaceOut, setReplaceOut] = useState("");
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const runLocal = useCallback(() => {
    setError("");
    setTestOk(null);
    setReplaceOut("");
    setMatches([]);
    try {
      const re = new RegExp(pattern, flags);
      if (mode === "test") {
        setTestOk(re.test(text));
        return;
      }
      if (mode === "replace") {
        setReplaceOut(text.replace(re, replacement));
        return;
      }
      const list: Array<{ match: string; index: number; groups: string[] }> = [];
      if (!flags.includes("g")) {
        const m = re.exec(text);
        if (m) list.push({ match: m[0] ?? "", index: m.index, groups: m.slice(1) });
      } else {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        let guard = 0;
        while ((m = re.exec(text)) !== null) {
          list.push({ match: m[0] ?? "", index: m.index, groups: m.slice(1) });
          guard += 1;
          if (guard > 10_000) throw new Error("Too many matches");
          if (m[0] === "") re.lastIndex += 1;
        }
      }
      setMatches(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [flags, mode, pattern, replacement, text]);

  const highlighted = useMemo(() => {
    if (mode !== "match" || matches.length === 0) return null;
    const parts: Array<{ text: string; hit: boolean }> = [];
    let cursor = 0;
    const sorted = [...matches].sort((a, b) => a.index - b.index);
    for (const m of sorted) {
      if (m.index < cursor) continue;
      if (m.index > cursor) parts.push({ text: text.slice(cursor, m.index), hit: false });
      parts.push({ text: m.match, hit: true });
      cursor = m.index + m.match.length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
    return parts;
  }, [matches, mode, text]);

  const runServer = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { pattern, flags, text, mode, replacement });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (mode === "replace" && typeof r.output.result === "string") setReplaceOut(r.output.result);
    else if (mode === "test") setTestOk(Boolean(r.output.ok ?? r.output.result));
    else if (Array.isArray(r.output.matches)) {
      setMatches(
        (r.output.matches as Array<{ match: string; index: number; groups?: string[] }>).map(
          (m) => ({
            match: m.match,
            index: m.index,
            groups: m.groups ?? [],
          }),
        ),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("regex.pattern")}
          id="re-pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="font-mono"
        />
        <Input
          label={t("regex.flags")}
          id="re-flags"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          className="font-mono"
          placeholder="gim"
        />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          label={t("common.mode")}
          id="re-mode"
          value={mode}
          onChange={(v) => setMode(v as typeof mode)}
        >
          <option value="match">{t("regex.match")}</option>
          <option value="replace">{t("regex.replace")}</option>
          <option value="test">{t("regex.test")}</option>
        </RunnerSelect>
        {mode === "replace" ? (
          <Input
            label={t("regex.replacement")}
            id="re-repl"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            className="min-w-[12rem] font-mono"
          />
        ) : null}
        <Button type="button" variant="ink" onClick={runLocal}>
          {t("regex.local")}
        </Button>
        <Button type="button" variant="outline" onClick={() => void runServer()} disabled={loading}>
          {loading ? t("common.running") : t("regex.server")}
        </Button>
        {mode === "match" ? (
          <span className="rounded-full bg-[var(--neutral-3)] px-3 py-1 text-xs tabular-nums text-[var(--neutral-11)]">
            {t("regex.count", { count: matches.length })}
          </span>
        ) : null}
        {testOk !== null ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              testOk
                ? "bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-[var(--status-success)]"
                : "bg-[color-mix(in_srgb,var(--status-danger)_15%,transparent)] text-[var(--status-danger)]"
            }`}
          >
            {testOk ? "true" : "false"}
          </span>
        ) : null}
      </div>
      <Textarea
        id="re-text"
        label={t("common.text")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      {highlighted ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {highlighted.map((p, i) =>
            p.hit ? (
              <mark
                key={i}
                className="rounded-sm bg-[color-mix(in_srgb,var(--status-warning)_45%,transparent)] px-0.5 text-[var(--neutral-12)]"
              >
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
      ) : null}
      {mode === "replace" && replaceOut ? <RunnerOutput>{replaceOut}</RunnerOutput> : null}
      {mode === "match" && matches.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--neutral-2)] text-xs text-[var(--neutral-11)]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">index</th>
                <th className="px-3 py-2">match</th>
                <th className="px-3 py-2">groups</th>
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, 100).map((m, i) => (
                <tr key={`${m.index}-${i}`} className="border-t border-[var(--neutral-6)]">
                  <td className="px-3 py-1.5 font-mono text-xs">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{m.index}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{m.match}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-[var(--neutral-11)]">
                    {m.groups.length ? m.groups.join(" · ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{t("regex.sotaNote")}</RunnerNote>
    </div>
  );
}

// ─── QR live preview ────────────────────────────────────────────────────────

export function QrSotaRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("https://forge.nebutra.com");
  const [size, setSize] = useState(256);
  const [ecl, setEcl] = useState("M");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState("");

  const generate = async () => {
    if (!text.trim()) {
      setError(t("qr.needText"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, {
      text: text.trim(),
      format: "dataurl",
      width: size,
      errorCorrectionLevel: ecl,
      margin: 2,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setPreview("");
      return;
    }
    const data = typeof r.output.data === "string" ? r.output.data : "";
    setPreview(data);
    setEngine(String(r.output.engine ?? "qrcode"));
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if (text.trim().length > 0) void generate();
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced preview
  }, [text, size, ecl]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = "qrcode.png";
    a.click();
  };

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="qr-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect
          id="qr-size"
          label={t("qr.size")}
          value={String(size)}
          onChange={(v) => setSize(Number(v))}
        >
          {[128, 256, 384, 512].map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </RunnerSelect>
        <RunnerSelect id="qr-ecl" label={t("qr.ecl")} value={ecl} onChange={setEcl}>
          {["L", "M", "Q", "H"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </RunnerSelect>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void generate()} disabled={loading}>
          {loading ? t("common.running") : t("qr.generate")}
        </Button>
        {preview ? (
          <Button type="button" variant="ghost" onClick={download}>
            <ArrowDown className="h-4 w-4" />
            {t("qr.download")}
          </Button>
        ) : null}
      </div>
      <RunnerError>{error}</RunnerError>
      {preview ? (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="QR"
            className="h-auto max-w-full rounded"
            width={size}
            height={size}
          />
          {engine ? (
            <p className="font-mono text-[11px] text-[var(--neutral-10)]">{engine}</p>
          ) : null}
        </div>
      ) : null}
      <RunnerNote>{t("qr.note")}</RunnerNote>
    </div>
  );
}

// ─── Multi-hash ─────────────────────────────────────────────────────────────

export function MultiHashSotaRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("nebutra");
  const [encoding, setEncoding] = useState("hex");
  const [digests, setDigests] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, encoding });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setDigests({});
      return;
    }
    const next: Record<string, string> = {};
    for (const k of ["md5", "sha1", "sha256", "sha512"]) {
      if (typeof r.output[k] === "string") next[k] = String(r.output[k]);
    }
    setDigests(next);
  };

  return (
    <div className="space-y-4">
      <Textarea
        label={t("common.text")}
        id="mh-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          id="mh-enc"
          label={t("multiHash.encoding")}
          value={encoding}
          onChange={setEncoding}
        >
          <option value="hex">hex</option>
          <option value="base64">base64</option>
        </RunnerSelect>
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? t("common.running") : t("common.run")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {Object.keys(digests).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(digests).map(([algo, value]) => (
            <div
              key={algo}
              className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-3 py-2"
            >
              <span className="w-16 font-mono text-xs font-semibold uppercase text-[var(--neutral-11)]">
                {algo}
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--neutral-12)]">
                {value}
              </code>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => {
                  void navigator.clipboard.writeText(value);
                  setCopied(algo);
                  setTimeout(() => setCopied(null), 1000);
                }}
              >
                {copied === algo ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <RunnerNote>{t("multiHash.sotaNote")}</RunnerNote>
    </div>
  );
}

// ─── Gap tool runners ───────────────────────────────────────────────────────

export function PdfTextRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [base64, setBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [layout, setLayout] = useState("layout");
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setText("");
    setMeta("");
    setBase64(await fileToBase64(file));
  };

  const run = async () => {
    if (!base64) {
      setError(t("pdfText.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { fileBase64: base64, layout });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setText(String(r.output.text ?? ""));
    setMeta(
      `${String(r.output.engine)} · ${String(r.output.chars ?? 0)} chars${
        r.output.truncated ? " · truncated" : ""
      }`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("pdfText.file")}</p>
        <input
          data-allow-native
          type="file"
          accept="application/pdf,.pdf"
          className="block w-full text-sm"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        {fileName ? <p className="text-xs text-[var(--neutral-11)]">{fileName}</p> : null}
      </div>
      <RunnerSelect id="pdf-layout" label={t("pdfText.layout")} value={layout} onChange={setLayout}>
        <option value="layout">layout</option>
        <option value="raw">raw</option>
      </RunnerSelect>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading || !base64}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {meta ? <RunnerNote>{meta}</RunnerNote> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {base64 ? <PdfResultPanel base64={base64} filename={fileName || "source.pdf"} /> : null}
        <div className="space-y-2">
          {text ? (
            <>
              <TextResultActions text={text} downloadName="extracted.txt" />
              <RunnerOutput className="max-h-96 overflow-auto whitespace-pre-wrap text-sm">
                {text}
              </RunnerOutput>
            </>
          ) : null}
        </div>
      </div>
      <RunnerNote>{t("pdfText.note")}</RunnerNote>
    </div>
  );
}

function parseCsvPreview(csv: string, maxRows = 40): string[][] {
  const lines = csv
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .slice(0, maxRows);
  return lines.map((line) => {
    // Lightweight CSV split — good enough for preview grids (not a full parser).
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    return cells;
  });
}

export function XlsxTextRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [base64, setBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setCsv("");
    setMeta("");
    setBase64(await fileToBase64(file));
  };

  const run = async () => {
    if (!base64) {
      setError(t("xlsxText.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { fileBase64: base64 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setCsv(String(r.output.csv ?? ""));
    setMeta(
      `${String(r.output.engine)} · ${String(r.output.rows ?? 0)}×${String(r.output.cols ?? 0)}`,
    );
  };

  const grid = csv ? parseCsvPreview(csv) : [];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("xlsxText.file")}</p>
        <input
          data-allow-native
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="block w-full text-sm"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        {fileName ? <p className="text-xs text-[var(--neutral-11)]">{fileName}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ink"
          onClick={() => void run()}
          disabled={loading || !base64}
        >
          {loading ? t("xlsxText.extracting") : t("xlsxText.extract")}
        </Button>
        {csv ? (
          <TextResultActions text={csv} downloadName="sheet.csv" contentType="text/csv" />
        ) : null}
      </div>
      <RunnerError>{error}</RunnerError>
      {meta ? <RunnerNote>{meta}</RunnerNote> : null}
      {grid.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--neutral-12)]">{t("common.tablePreview")}</p>
          <div className="max-h-96 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri} className={ri === 0 ? "font-medium text-[var(--neutral-12)]" : ""}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border-b border-[var(--neutral-4)] px-2 py-1.5 font-mono text-[var(--neutral-11)]"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {csv ? (
        <RunnerOutput className="max-h-48 overflow-auto whitespace-pre-wrap text-sm">
          {csv}
        </RunnerOutput>
      ) : null}
      <RunnerNote>{t("xlsxText.note")}</RunnerNote>
    </div>
  );
}

export function DocxTextRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [base64, setBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setText("");
    setMeta("");
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    setBase64(btoa(binary));
  };

  const run = async () => {
    if (!base64) {
      setError(t("docxText.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { fileBase64: base64 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setText(String(r.output.text ?? ""));
    setMeta(`${String(r.output.engine)} · ${String(r.output.chars ?? 0)} chars`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("docxText.file")}</p>
        <input
          data-allow-native
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        {fileName ? <p className="text-xs text-[var(--neutral-11)]">{fileName}</p> : null}
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading || !base64}>
        {loading ? t("docxText.extracting") : t("docxText.extract")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {meta ? <RunnerNote>{meta}</RunnerNote> : null}
      {text ? (
        <RunnerOutput className="max-h-96 overflow-auto whitespace-pre-wrap text-sm">
          {text}
        </RunnerOutput>
      ) : null}
      <RunnerNote>{t("docxText.note")}</RunnerNote>
    </div>
  );
}

export function SvgOptimizeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">\n  <!-- logo -->\n  <circle cx="50" cy="50" r="40" fill="#0033FE" />\n</svg>',
  );
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (typeof r.output.result === "string") setText(r.output.result);
    setMeta(`${r.output.bytesIn} → ${r.output.bytesOut} (−${r.output.saved})`);
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="SVG"
        id="svg-in"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? t("common.running") : t("svg.optimize")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(text)}
        >
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {meta ? <RunnerNote>{meta}</RunnerNote> : null}
      <RunnerNote>{t("svg.note")}</RunnerNote>
    </div>
  );
}

export function RouterTranslateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("Hello, Nebutra Forge.");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, sourceLang, targetLang });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(r.output);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--status-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-warning)_8%,transparent)] px-3 py-2 text-sm text-[var(--neutral-11)]">
        {t("routerTranslate.lab")}
      </div>
      <Textarea
        label={t("common.text")}
        id="tr-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("routerTranslate.source")}
          id="tr-src"
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
        />
        <Input
          label={t("routerTranslate.target")}
          id="tr-tgt"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("routerTranslate.open")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result?.deepLink ? (
        <a
          href={String(result.deepLink)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm text-[var(--blue-11)] underline"
        >
          {t("routerTranslate.deepLink")}
        </a>
      ) : null}
      {result ? (
        <RunnerOutput className="text-xs">{JSON.stringify(result, null, 2)}</RunnerOutput>
      ) : null}
      <RunnerNote>{t("routerTranslate.note")}</RunnerNote>
    </div>
  );
}

export function ImageCropRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [base64, setBase64] = useState("");
  const [preview, setPreview] = useState("");
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(200);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [outUrl, setOutUrl] = useState("");
  const [drag, setDrag] = useState<{ x0: number; y0: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    setBase64(b64);
    const url = `data:${file.type || "image/png"};base64,${b64}`;
    setPreview(url);
    setOutUrl("");
    const img = new Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      const side = Math.min(img.naturalWidth, img.naturalHeight, 200);
      setLeft(0);
      setTop(0);
      setWidth(side);
      setHeight(side);
    };
    img.src = url;
  };

  const clientToNatural = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el || !natural.w) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const scaleX = natural.w / rect.width;
    const scaleY = natural.h / rect.height;
    const x = Math.max(0, Math.min(natural.w, (clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(natural.h, (clientY - rect.top) * scaleY));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!preview) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = clientToNatural(e.clientX, e.clientY);
    setDrag({ x0: p.x, y0: p.y });
    setLeft(p.x);
    setTop(p.y);
    setWidth(1);
    setHeight(1);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = clientToNatural(e.clientX, e.clientY);
    const x1 = Math.min(drag.x0, p.x);
    const y1 = Math.min(drag.y0, p.y);
    const x2 = Math.max(drag.x0, p.x);
    const y2 = Math.max(drag.y0, p.y);
    setLeft(x1);
    setTop(y1);
    setWidth(Math.max(1, x2 - x1));
    setHeight(Math.max(1, y2 - y1));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag(null);
  };

  const run = async () => {
    if (!base64) {
      setError(t("imageCrop.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, {
      imageBase64: base64,
      left,
      top,
      width,
      height,
      format: "png",
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const ct = String(r.output.contentType ?? "image/png");
    const b64 = String(r.output.base64 ?? "");
    setOutUrl(`data:${ct};base64,${b64}`);
  };

  const selStyle =
    natural.w > 0
      ? {
          left: `${(left / natural.w) * 100}%`,
          top: `${(top / natural.h) * 100}%`,
          width: `${(width / natural.w) * 100}%`,
          height: `${(height / natural.h) * 100}%`,
        }
      : undefined;

  return (
    <div className="space-y-4">
      <input
        data-allow-native
        type="file"
        accept="image/*"
        className="block w-full text-sm"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-[var(--neutral-10)]">{t("imageCrop.dragHint")}</p>
      {preview ? (
        <div
          ref={boxRef}
          className="relative max-w-full cursor-crosshair select-none overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-6)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="source"
            className="pointer-events-none block max-h-96 w-full object-contain"
            draggable={false}
          />
          {selStyle ? (
            <div
              className="pointer-events-none absolute border-2 border-primary bg-[color-mix(in_srgb,hsl(var(--primary))_18%,transparent)]"
              style={selStyle}
            />
          ) : null}
        </div>
      ) : null}
      {natural.w > 0 ? (
        <p className="text-xs text-[var(--neutral-10)]">
          {t("imageCrop.natural", { w: natural.w, h: natural.h })}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-4">
        <Input
          label={t("imageCrop.left")}
          id="c-l"
          type="number"
          value={String(left)}
          onChange={(e) => setLeft(Number(e.target.value) || 0)}
        />
        <Input
          label={t("imageCrop.top")}
          id="c-t"
          type="number"
          value={String(top)}
          onChange={(e) => setTop(Number(e.target.value) || 0)}
        />
        <Input
          label={t("imageCrop.width")}
          id="c-w"
          type="number"
          value={String(width)}
          onChange={(e) => setWidth(Math.max(1, Number(e.target.value) || 1))}
        />
        <Input
          label={t("imageCrop.height")}
          id="c-h"
          type="number"
          value={String(height)}
          onChange={(e) => setHeight(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading || !base64}>
        {loading ? t("common.running") : t("imageCrop.crop")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <div className="grid gap-4 sm:grid-cols-2">
        {outUrl ? (
          <div>
            <p className="mb-1 text-xs text-[var(--neutral-10)]">{t("imageCrop.result")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outUrl}
              alt="crop"
              className="max-h-64 rounded border border-[var(--neutral-6)]"
            />
          </div>
        ) : null}
      </div>
      <RunnerNote>{t("imageCrop.note")}</RunnerNote>
    </div>
  );
}

export function PptxTextRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [base64, setBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setText("");
    setMeta("");
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    setBase64(btoa(binary));
  };

  const run = async () => {
    if (!base64) {
      setError(t("pptxText.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { fileBase64: base64 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setText(String(r.output.text ?? ""));
    setMeta(`${String(r.output.engine)} · ${String(r.output.slides ?? 0)} slides`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("pptxText.file")}</p>
        <input
          data-allow-native
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="block w-full text-sm"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        {fileName ? <p className="text-xs text-[var(--neutral-11)]">{fileName}</p> : null}
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading || !base64}>
        {loading ? t("pptxText.extracting") : t("pptxText.extract")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {meta ? <RunnerNote>{meta}</RunnerNote> : null}
      {text ? (
        <RunnerOutput className="max-h-96 overflow-auto whitespace-pre-wrap text-sm">
          {text}
        </RunnerOutput>
      ) : null}
      <RunnerNote>{t("pptxText.note")}</RunnerNote>
    </div>
  );
}
