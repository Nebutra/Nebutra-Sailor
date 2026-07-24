"use client";

// @brand-exempt: sample password/markdown fixtures for forge runners only
/**
 * P1 specialized runners for high-traffic tools that previously used only
 * generic catalog forms — markdown, PDF, security, LLM cost/schema, CN text.
 * @see https://github.com/Nebutra/Nebutra-Sailor/issues/255
 */
import { DEFAULT_PUBLIC_MODEL, frontierSelectOptions } from "@nebutra/ai-providers/frontier";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { type ChangeEvent, useMemo, useState } from "react";
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
            className="size-4 accent-[var(--blue-9)]"
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
            {mode === "html" ? "HTML" : "预览"}
          </p>
          {mode === "html" ? (
            <RunnerOutput className="min-h-[280px] whitespace-pre-wrap break-all">
              {html || <span className="text-[var(--neutral-9)]">渲染结果</span>}
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
                <p className="text-sm text-[var(--neutral-9)]">点击运行查看预览</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "渲染中…" : mode === "html" ? "转为 HTML" : "预览"}
        </Button>
        {html ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(html)}
          >
            复制 HTML
          </Button>
        ) : null}
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>marked · 预览使用沙箱 iframe · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── PDF merge / split ──────────────────────────────────────────────────────

export function PdfMergeRunner({ toolId }: { toolId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (files.length < 2) {
      setError("请至少选择 2 个 PDF");
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
        `合并完成 · ${String(r.output.pageCount ?? "?")} 页 · ${String(r.output.bytes ?? "?")} bytes`,
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
        <span className="text-xs font-medium">PDF 文件（≥2，顺序即合并顺序）</span>
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
        {loading ? "合并中…" : "合并并下载"}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{meta || "pdf-lib · 与 API 同一路径"}</RunnerNote>
    </div>
  );
}

export function PdfSplitRunner({ toolId }: { toolId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [fromPage, setFromPage] = useState("1");
  const [toPage, setToPage] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!file) {
      setError("请选择 PDF");
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
        `拆分完成 · 源 ${String(r.output.sourcePages ?? "?")} 页 → 输出 ${String(r.output.pageCount ?? "?")} 页`,
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
        <span className="text-xs font-medium">PDF 文件</span>
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
          label="起始页 (1-based)"
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
          label="结束页 (空=到末页)"
          id="pdf-to"
          type="number"
          min={1}
          value={toPage}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setToPage(e.target.value)
          }
          className="font-mono"
          placeholder="末页"
        />
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "拆分中…" : "拆分并下载"}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{meta || "pdf-lib · 与 API 同一路径"}</RunnerNote>
    </div>
  );
}

// ─── Password strength ──────────────────────────────────────────────────────

const SCORE_LABEL = ["极弱", "弱", "一般", "较强", "很强"] as const;

export function PasswordStrengthRunner({ toolId }: { toolId: string }) {
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
        label="密码"
        id="pw-str"
        type="password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setPassword(e.target.value)
        }
        className="font-mono"
      />
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "检测中…" : "检测强度"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {score != null ? (
        <RunnerPanel>
          <p className="text-2xl font-semibold tabular-nums">
            {score}/4 · {SCORE_LABEL[score] ?? score}
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
            <p className="mt-3 text-xs text-[var(--neutral-10)]">离线慢哈希粗估：{crack}</p>
          ) : null}
          {feedback.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--neutral-11)]">
              {feedback.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>zxcvbn-ts · 与 API 同一路径 · 密码不会落盘</RunnerNote>
    </div>
  );
}

// ─── HMAC ───────────────────────────────────────────────────────────────────

export function HmacRunner({ toolId }: { toolId: string }) {
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
        label="消息"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={5}
        className="font-mono text-sm"
      />
      <Input
        label="密钥"
        id="hmac-secret"
        type="password"
        value={secret}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setSecret(e.target.value)
        }
        className="font-mono"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect label="算法" id="hmac-algo" value={algorithm} onChange={setAlgorithm}>
          <option value="sha256">SHA-256</option>
          <option value="sha512">SHA-512</option>
          <option value="sha1">SHA-1</option>
        </RunnerSelect>
        <RunnerSelect label="编码" id="hmac-enc" value={encoding} onChange={setEncoding}>
          <option value="hex">hex</option>
          <option value="base64">base64</option>
        </RunnerSelect>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "计算中…" : "计算 HMAC"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!digest}
          onClick={() => void navigator.clipboard.writeText(digest)}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="break-all">{digest}</RunnerOutput>
      <RunnerNote>node:crypto · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── File checksum ──────────────────────────────────────────────────────────

export function FileChecksumRunner({ toolId }: { toolId: string }) {
  const [file, setFile] = useState<File | null>(null);
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

  const selected = useMemo(
    () =>
      Object.entries(algos)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [algos],
  );

  const run = async () => {
    if (!file) {
      setError("请选择文件");
      return;
    }
    if (selected.length === 0) {
      setError("请至少选一种算法");
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
      setBytes(typeof r.output.bytes === "number" ? r.output.bytes : null);
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

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--neutral-11)]">
        <span className="text-xs font-medium">文件</span>
        <input
          data-allow-native
          type="file"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm text-[var(--neutral-11)]">
        {(["md5", "sha1", "sha256", "sha512"] as const).map((algo) => (
          <label key={algo} className="inline-flex items-center gap-2">
            <input
              data-allow-native
              type="checkbox"
              checked={Boolean(algos[algo])}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAlgos((a) => ({ ...a, [algo]: e.target.checked }))
              }
              className="size-4 accent-[var(--blue-9)]"
            />
            {algo}
          </label>
        ))}
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "计算中…" : "计算校验和"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {bytes != null ? (
        <RunnerPanel title={`${bytes} bytes`}>
          <ul className="space-y-2 font-mono text-xs break-all">
            {Object.entries(hashes).map(([k, v]) => (
              <li key={k}>
                <span className="text-[var(--neutral-10)]">{k}:</span> {v}
              </li>
            ))}
          </ul>
        </RunnerPanel>
      ) : null}
      <RunnerNote>node:crypto · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── Cost estimate ──────────────────────────────────────────────────────────

export function CostEstimateRunner({ toolId }: { toolId: string }) {
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
        label="输入文本（用于估算 input tokens）"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
        className="font-mono text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect label="模型" id="cost-model" value={model} onChange={setModel}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </RunnerSelect>
        <Input
          label="输出 tokens 估"
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
        {loading ? "估算中…" : "估算费用"}
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
      <RunnerNote>@nebutra/ai-providers/frontier 价卡 + js-tiktoken · 标价球估，非账单</RunnerNote>
    </div>
  );
}

// ─── JSON Schema validate ───────────────────────────────────────────────────

export function JsonSchemaValidateRunner({ toolId }: { toolId: string }) {
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
          label="JSON 数据"
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
        {loading ? "校验中…" : "校验"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {valid != null ? (
        <RunnerPanel>
          <p
            className="text-lg font-semibold"
            style={{ color: valid ? "var(--status-success)" : "var(--status-danger)" }}
          >
            {valid ? "通过" : "未通过"}
          </p>
          {!valid && errors ? (
            <pre className="mt-2 overflow-x-auto font-mono text-xs">
              {JSON.stringify(errors, null, 2)}
            </pre>
          ) : null}
        </RunnerPanel>
      ) : null}
      <RunnerNote>Ajv · 与 API 同一路径</RunnerNote>
    </div>
  );
}

// ─── 简繁 / 拼音 ────────────────────────────────────────────────────────────

export function ZhCnTwRunner({ toolId }: { toolId: string }) {
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
      <RunnerSelect label="方向" id="zh-mode" value={mode} onChange={setMode}>
        <option value="s2t">简 → 繁</option>
        <option value="t2s">繁 → 简</option>
        <option value="s2tw">简 → 台湾</option>
        <option value="tw2s">台湾 → 简</option>
        <option value="s2hk">简 → 香港</option>
        <option value="hk2s">香港 → 简</option>
      </RunnerSelect>
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          id="zh-in"
          label="输入"
          value={text}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
          rows={10}
          className="min-h-[220px]"
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-11)]">输出</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!result}
              onClick={() => void navigator.clipboard.writeText(result)}
            >
              复制
            </Button>
          </div>
          <RunnerOutput className="min-h-[220px] whitespace-pre-wrap">{result}</RunnerOutput>
        </div>
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "转换中…" : "转换"}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>OpenCC (opencc-js) · 与 API 同一路径</RunnerNote>
    </div>
  );
}

export function PinyinRunner({ toolId }: { toolId: string }) {
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
      <RunnerSelect label="声调" id="py-tone" value={toneType} onChange={setToneType}>
        <option value="symbol">符号 nǐ</option>
        <option value="num">数字 ni3</option>
        <option value="none">无调 ni</option>
      </RunnerSelect>
      <Textarea
        id="py-text"
        label="汉字"
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        rows={6}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? "转换中…" : "转拼音"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!result}
          onClick={() => void navigator.clipboard.writeText(result)}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="whitespace-pre-wrap text-lg tracking-wide">{result}</RunnerOutput>
      <RunnerNote>pinyin-pro · 与 API 同一路径</RunnerNote>
    </div>
  );
}
