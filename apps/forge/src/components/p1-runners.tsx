"use client";

// @brand-exempt: sample password/markdown fixtures for forge runners only
/**
 * P1 specialized runners for high-traffic tools that previously used only
 * generic catalog forms — markdown, PDF, security, LLM cost/schema, CN text.
 * @see https://github.com/Nebutra/Nebutra-Sailor/issues/255
 */
import { DEFAULT_PUBLIC_MODEL, frontierSelectOptions } from "@nebutra/ai-providers/frontier";
import { Check, Copy } from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from "react";
import {
  RunnerError,
  RunnerNote,
  RunnerOutput,
  RunnerPanel,
  RunnerSelect,
} from "@/components/runner-ui";

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

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function downloadBase64(base64: string, filename: string, contentType: string) {
  const a = document.createElement("a");
  a.href = `data:${contentType};base64,${base64}`;
  a.download = filename;
  a.click();
}

// ─── Markdown preview / HTML ────────────────────────────────────────────────

const MD_SAMPLE = `# Nebutra Forge

**在线工具站** · 同一套能力服务人类与 Agent。

- Markdown 预览
- PDF / 安全 / 费用估算

\`\`\`ts
const ok = true;
\`\`\`
`;

export function MarkdownPreviewRunner({
  toolId,
  mode = "preview",
}: {
  toolId: string;
  mode?: "preview" | "html";
}) {
  const t = useTranslations("runners");
  const [text, setText] = useState(MD_SAMPLE);
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gfm, setGfm] = useState(true);

  const run = async () => {
    setLoading(true);
    setError("");
    const input = mode === "html" ? { text, gfm } : { text };
    const r = await invokeTool(toolId, input);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setHtml(typeof r.output.html === "string" ? r.output.html : "");
  };

  return (
    <div className="space-y-4">
      {mode === "html" ? (
        <label className="inline-flex items-center gap-2 text-sm text-[var(--neutral-11)]">
          <input
            data-allow-native
            type="checkbox"
            checked={gfm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGfm(e.target.checked)}
            className="size-4 accent-primary"
          />
          GFM
        </label>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          id="md-src"
          label="Markdown"
          value={text}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
          rows={14}
          className="min-h-[280px] font-mono text-sm"
          spellCheck={false}
        />
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--neutral-11)]">
            {mode === "html" ? t("markdown.html") : t("markdown.preview")}
          </p>
          {mode === "html" ? (
            <RunnerOutput className="min-h-[280px] whitespace-pre-wrap break-all">
              {html || <span className="text-[var(--neutral-9)]">{t("markdown.emptyHtml")}</span>}
            </RunnerOutput>
          ) : (
            <div className="min-h-[280px] overflow-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4">
              {html ? (
                <iframe
                  title="Markdown preview"
                  sandbox=""
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;line-height:1.55;color:#111;margin:0;padding:0.25rem} pre{overflow:auto;background:#f4f4f5;padding:0.75rem;border-radius:8px} code{font-family:ui-monospace,monospace}</style></head><body>${html}</body></html>`}
                  className="h-[280px] w-full border-0"
                />
              ) : (
                <p className="text-sm text-[var(--neutral-9)]">{t("markdown.emptyPreview")}</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading
            ? t("markdown.rendering")
            : mode === "html"
              ? t("markdown.toHtml")
              : t("markdown.preview")}
        </Button>
        {html ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(html)}
          >
            {t("markdown.copyHtml")}
          </Button>
        ) : null}
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{t("markdown.note")}</RunnerNote>
    </div>
  );
}

// ─── PDF merge / split ──────────────────────────────────────────────────────

export function PdfMergeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (files.length < 2) {
      setError(t("pdfMerge.needFiles"));
      return;
    }
    setLoading(true);
    setError("");
    setMeta("");
    try {
      const filesBase64 = await Promise.all(files.map((f) => fileToBase64(f)));
      const r = await invokeTool(toolId, { filesBase64 });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      const b64 = typeof r.output.base64 === "string" ? r.output.base64 : "";
      if (b64) downloadBase64(b64, "merged.pdf", "application/pdf");
      setMeta(
        t("pdfMerge.done", {
          pages: String(r.output.pageCount ?? "?"),
          bytes: String(r.output.bytes ?? "?"),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--neutral-11)]">
        <span className="text-xs font-medium">{t("pdfMerge.files")}</span>
        <input
          data-allow-native
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFiles(Array.from(e.target.files ?? []))
          }
          className="text-sm"
        />
      </label>
      {files.length > 0 ? (
        <ul className="space-y-1 text-xs font-mono text-[var(--neutral-11)]">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {i + 1}. {f.name} ({f.size} B)
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("pdfMerge.merging") : t("pdfMerge.mergeDownload")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{meta || t("pdfMerge.note")}</RunnerNote>
    </div>
  );
}

export function PdfSplitRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [file, setFile] = useState<File | null>(null);
  const [fromPage, setFromPage] = useState("1");
  const [toPage, setToPage] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!file) {
      setError(t("pdfSplit.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    setMeta("");
    try {
      const fileBase64 = await fileToBase64(file);
      const input: Record<string, unknown> = {
        fileBase64,
        fromPage: Number(fromPage) || 1,
      };
      if (toPage.trim()) input.toPage = Number(toPage);
      const r = await invokeTool(toolId, input);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      const b64 = typeof r.output.base64 === "string" ? r.output.base64 : "";
      if (b64) downloadBase64(b64, "split.pdf", "application/pdf");
      setMeta(
        t("pdfSplit.done", {
          source: String(r.output.sourcePages ?? "?"),
          pages: String(r.output.pageCount ?? "?"),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--neutral-11)]">
        <span className="text-xs font-medium">{t("pdfSplit.file")}</span>
        <input
          data-allow-native
          type="file"
          accept="application/pdf"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("pdfSplit.fromPage")}
          id="pdf-from"
          type="number"
          min={1}
          value={fromPage}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setFromPage(e.target.value)
          }
          className="font-mono"
        />
        <Input
          label={t("pdfSplit.toPage")}
          id="pdf-to"
          type="number"
          min={1}
          value={toPage}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setToPage(e.target.value)
          }
          className="font-mono"
          placeholder={t("pdfSplit.toPlaceholder")}
        />
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("pdfSplit.splitting") : t("pdfSplit.splitDownload")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{meta || t("pdfSplit.note")}</RunnerNote>
    </div>
  );
}

// ─── Password strength ──────────────────────────────────────────────────────

export function PasswordStrengthRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [password, setPassword] = useState("Nebutra!2024");
  const [error, setError] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [crack, setCrack] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { password });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const s = typeof r.output.score === "number" ? r.output.score : null;
    setScore(s);
    const fb = r.output.feedback as { warning?: string; suggestions?: string[] } | undefined;
    const tips = [
      ...(fb?.warning ? [fb.warning] : []),
      ...((fb?.suggestions as string[] | undefined) ?? []),
    ];
    setFeedback(tips);
    const ct = r.output.crackTimes as { offlineSlowHashing1e4PerSecond?: string } | undefined;
    setCrack(
      typeof ct?.offlineSlowHashing1e4PerSecond === "string"
        ? ct.offlineSlowHashing1e4PerSecond
        : "",
    );
  };

  return (
    <div className="space-y-4">
      <Input
        label={t("common.password")}
        id="pw-str"
        type="password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setPassword(e.target.value)
        }
        className="font-mono"
      />
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("passwordStrength.checking") : t("passwordStrength.check")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {score != null ? (
        <RunnerPanel>
          <p className="text-2xl font-semibold tabular-nums">
            {score}/4 · {t(`passwordStrength.score${score}` as "passwordStrength.score0")}
          </p>
          <div className="mt-3 flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-full"
                style={{
                  background:
                    i <= score
                      ? i <= 1
                        ? "var(--status-danger)"
                        : i === 2
                          ? "var(--status-warning)"
                          : "var(--status-success)"
                      : "var(--neutral-4)",
                }}
              />
            ))}
          </div>
          {crack ? (
            <p className="mt-3 text-xs text-[var(--neutral-10)]">
              {t("passwordStrength.crack", { time: crack })}
            </p>
          ) : null}
          {feedback.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--neutral-11)]">
              {feedback.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("passwordStrength.note")}</RunnerNote>
    </div>
  );
}

// ─── HMAC ───────────────────────────────────────────────────────────────────

export function HmacRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("payload");
  const [secret, setSecret] = useState("secret");
  const [algorithm, setAlgorithm] = useState("sha256");
  const [encoding, setEncoding] = useState("hex");
  const [digest, setDigest] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, secret, algorithm, encoding });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setDigest(typeof r.output.digest === "string" ? r.output.digest : "");
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="hmac-text"
        label={t("common.message")}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={5}
        className="font-mono text-sm"
      />
      <Input
        label={t("common.secret")}
        id="hmac-secret"
        type="password"
        value={secret}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setSecret(e.target.value)
        }
        className="font-mono"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect
          label={t("common.algorithm")}
          id="hmac-algo"
          value={algorithm}
          onChange={setAlgorithm}
        >
          <option value="sha256">SHA-256</option>
          <option value="sha512">SHA-512</option>
          <option value="sha1">SHA-1</option>
        </RunnerSelect>
        <RunnerSelect
          label={t("common.encoding")}
          id="hmac-enc"
          value={encoding}
          onChange={setEncoding}
        >
          <option value="hex">hex</option>
          <option value="base64">base64</option>
        </RunnerSelect>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? t("hmacSign.computing") : t("hmacSign.compute")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!digest}
          onClick={() => void navigator.clipboard.writeText(digest)}
        >
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="break-all">{digest}</RunnerOutput>
      <RunnerNote>{t("hmacSign.note")}</RunnerNote>
    </div>
  );
}

// ─── File checksum (SOTA: drag-drop + multi-algo copy rows) ─────────────────

const CHECKSUM_ALGOS = ["md5", "sha1", "sha256", "sha512"] as const;

export function FileChecksumRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [algos, setAlgos] = useState<Record<string, boolean>>({
    md5: true,
    sha1: false,
    sha256: true,
    sha512: false,
  });
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [bytes, setBytes] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      Object.entries(algos)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [algos],
  );

  const pickFile = (next: File | null) => {
    setFile(next);
    setHashes({});
    setBytes(null);
    setError("");
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) pickFile(f);
  };

  const run = async () => {
    if (!file) {
      setError(t("fileChecksum.needFile"));
      return;
    }
    if (selected.length === 0) {
      setError(t("fileChecksum.needAlgo"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fileBase64 = await fileToBase64(file);
      const r = await invokeTool(toolId, { fileBase64, algorithms: selected });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setBytes(typeof r.output.bytes === "number" ? r.output.bytes : file.size);
      setHashes(
        r.output.hashes && typeof r.output.hashes === "object"
          ? (r.output.hashes as Record<string, string>)
          : {},
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyOne = (algo: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(algo);
    setTimeout(() => setCopied(null), 1000);
  };

  return (
    <div className="space-y-4">
      {/* label + hidden input: native click-to-open and keyboard activation,
          no synthetic role/tabIndex/key handling. */}
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed px-4 py-10 text-center transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[hsl(var(--ring)/0.5)] ${
          dragging
            ? "border-primary bg-[var(--blue-3)]/40"
            : "border-[var(--neutral-6)] bg-[var(--neutral-2)]/40 hover:border-[var(--neutral-8)]"
        }`}
      >
        <p className="text-sm font-medium text-[var(--neutral-12)]">{t("fileChecksum.drop")}</p>
        {file ? (
          <p className="max-w-full truncate font-mono text-xs text-[var(--neutral-11)]">
            {file.name} · {t("common.bytes", { bytes: file.size })}
          </p>
        ) : null}
        <input
          ref={inputRef}
          data-allow-native
          type="file"
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => pickFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--neutral-11)]">
          {t("fileChecksum.algorithms")}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-[var(--neutral-11)]">
          {CHECKSUM_ALGOS.map((algo) => (
            <label key={algo} className="inline-flex items-center gap-2">
              <input
                data-allow-native
                type="checkbox"
                checked={Boolean(algos[algo])}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAlgos((a) => ({ ...a, [algo]: e.target.checked }))
                }
                className="size-4 accent-primary"
              />
              <span className="font-mono uppercase">{algo}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? t("fileChecksum.computing") : t("fileChecksum.compute")}
        </Button>
        {file || Object.keys(hashes).length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              pickFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {t("common.clear")}
          </Button>
        ) : null}
      </div>

      <RunnerError>{error}</RunnerError>

      {Object.keys(hashes).length > 0 ? (
        <div className="space-y-2">
          {bytes != null ? (
            <p className="text-xs text-[var(--neutral-10)]">{t("common.bytes", { bytes })}</p>
          ) : null}
          {Object.entries(hashes).map(([algo, value]) => (
            <div
              key={algo}
              className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-3 py-2"
            >
              <span className="w-16 font-mono text-xs font-semibold uppercase text-[var(--neutral-11)]">
                {algo}
              </span>
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--neutral-12)]">
                {value}
              </code>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2"
                aria-label={t("common.copy")}
                onClick={() => copyOne(algo, value)}
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

      <RunnerNote>{t("fileChecksum.note")}</RunnerNote>
    </div>
  );
}

// ─── Cost estimate ──────────────────────────────────────────────────────────

export function CostEstimateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const options = useMemo(() => frontierSelectOptions(), []);
  const [text, setText] = useState("Explain quantum computing in simple terms.");
  const [model, setModel] = useState(DEFAULT_PUBLIC_MODEL);
  const [outputTokens, setOutputTokens] = useState("500");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, {
      text,
      model,
      outputTokens: Number(outputTokens) || 0,
      encoding: "o200k_base",
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setResult(null);
      return;
    }
    setResult(r.output);
  };

  return (
    <div className="space-y-4">
      <Textarea
        id="cost-text"
        label={t("costEstimate.text")}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
        className="font-mono text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect
          label={t("costEstimate.model")}
          id="cost-model"
          value={model}
          onChange={setModel}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </RunnerSelect>
        <Input
          label={t("costEstimate.outputTokens")}
          id="cost-out"
          type="number"
          min={0}
          value={outputTokens}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setOutputTokens(e.target.value)
          }
          className="font-mono"
        />
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("costEstimate.estimating") : t("costEstimate.estimate")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <RunnerPanel>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            ${String(result.totalUsd ?? "—")}
          </p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            {String(result.label ?? result.model ?? "")} · {String(result.provider ?? "")}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs tabular-nums text-[var(--neutral-11)]">
            <div>input tokens: {String(result.inputTokens)}</div>
            <div>output tokens: {String(result.outputTokens)}</div>
            <div>input $: {String(result.inputUsd)}</div>
            <div>output $: {String(result.outputUsd)}</div>
          </dl>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("costEstimate.note")}</RunnerNote>
    </div>
  );
}

// ─── JSON Schema validate ───────────────────────────────────────────────────

export function JsonSchemaValidateRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [data, setData] = useState('{"name":"Ada","age":30}');
  const [schema, setSchema] = useState(
    '{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"number"}},"required":["name"]}',
  );
  const [error, setError] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { data, schema });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setValid(null);
      return;
    }
    setValid(Boolean(r.output.valid));
    setErrors(r.output.errors ?? null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          id="jsv-data"
          label={t("jsonSchema.data")}
          value={data}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setData(e.target.value)
          }
          rows={10}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <Textarea
          id="jsv-schema"
          label="JSON Schema"
          value={schema}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setSchema(e.target.value)
          }
          rows={10}
          className="font-mono text-sm"
          spellCheck={false}
        />
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("jsonSchema.validating") : t("jsonSchema.validate")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {valid != null ? (
        <RunnerPanel>
          <p
            className="text-lg font-semibold"
            style={{ color: valid ? "var(--status-success)" : "var(--status-danger)" }}
          >
            {valid ? t("jsonSchema.pass") : t("jsonSchema.fail")}
          </p>
          {!valid && errors ? (
            <pre className="mt-2 overflow-x-auto font-mono text-xs">
              {JSON.stringify(errors, null, 2)}
            </pre>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("jsonSchema.note")}</RunnerNote>
    </div>
  );
}

// ─── 简繁 / 拼音 ────────────────────────────────────────────────────────────

export function ZhCnTwRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("汉字与计算机，繁體測試");
  const [mode, setMode] = useState("s2t");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, mode });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "string" ? r.output.result : "");
  };

  return (
    <div className="space-y-4">
      <RunnerSelect label={t("common.direction")} id="zh-mode" value={mode} onChange={setMode}>
        <option value="s2t">{t("zhCnTw.s2t")}</option>
        <option value="t2s">{t("zhCnTw.t2s")}</option>
        <option value="s2tw">{t("zhCnTw.s2tw")}</option>
        <option value="tw2s">{t("zhCnTw.tw2s")}</option>
        <option value="s2hk">{t("zhCnTw.s2hk")}</option>
        <option value="hk2s">{t("zhCnTw.hk2s")}</option>
      </RunnerSelect>
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          id="zh-in"
          label={t("common.input")}
          value={text}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
          rows={10}
          className="min-h-[220px]"
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-11)]">
              {t("common.output")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!result}
              onClick={() => void navigator.clipboard.writeText(result)}
            >
              {t("common.copy")}
            </Button>
          </div>
          <RunnerOutput className="min-h-[220px] whitespace-pre-wrap">{result}</RunnerOutput>
        </div>
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("convert.converting") : t("convert.convert")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{t("zhCnTw.note")}</RunnerNote>
    </div>
  );
}

export function PinyinRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState("你好，世界");
  const [toneType, setToneType] = useState("symbol");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { text, toneType, type: "string" });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const out = r.output.result;
    setResult(typeof out === "string" ? out : JSON.stringify(out));
  };

  return (
    <div className="space-y-4">
      <RunnerSelect label={t("pinyin.tones")} id="py-tone" value={toneType} onChange={setToneType}>
        <option value="symbol">{t("pinyin.symbol")}</option>
        <option value="num">{t("pinyin.num")}</option>
        <option value="none">{t("pinyin.none")}</option>
      </RunnerSelect>
      <Textarea
        id="py-text"
        label={t("pinyin.hanzi")}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? t("pinyin.converting") : t("pinyin.convert")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="whitespace-pre-wrap text-lg tracking-wide">{result}</RunnerOutput>
      <RunnerNote>{t("pinyin.note")}</RunnerNote>
    </div>
  );
}
