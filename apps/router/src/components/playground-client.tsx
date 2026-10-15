"use client";

import { brand } from "@nebutra/brand/metadata";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import {
  Button,
  CopyButton,
  Select,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { consoleApi } from "@/lib/console-api";
import {
  ConsoleError,
  consoleStream,
  createRequestLane,
  describeError,
  isAbortError,
  readArray,
  readNumber,
  readRecord,
  readSseData,
  readString,
} from "@/lib/console-client";
import { formatAmount, formatTokens } from "@/lib/console-format";

/**
 * 快捷使用 — the trial console.
 *
 * Three defects are closed here and they were all about the screen telling the
 * truth:
 *
 * - The initial model came from `window.location.search` read in an effect
 *   *after* mount, so the wrong model rendered first and then swapped. It now
 *   arrives as a prop the server already resolved.
 * - There was no `AbortController`. Two sends in a row resolved in whatever
 *   order the network chose, and the older answer could overwrite the newer
 *   one. Every send now owns a lane, and 停止 is a real stop.
 * - `data.error` was written into the output pane in the same font as a reply,
 *   so "insufficient balance" read like something the model said. Errors are
 *   now a separate, red, retryable panel.
 *
 * And the thing that was missing entirely: what the call cost. Tokens arrive on
 * the stream's final chunk; the charge is read back from the ledger, which is
 * the only place the real number exists.
 */

interface Turn {
  id: string;
  prompt: string;
  model: string;
  /** Grows while the stream runs. */
  answer: string;
  status: "streaming" | "done" | "cancelled" | "failed";
  error: string | null;
  /** The refusal was "no active key", so the error offers the way to make one. */
  needsKey: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  requestId: string | null;
  cost: number | null;
  currency: string;
  /** True while the ledger row is still being looked up. */
  settling: boolean;
}

type CodeLang = "curl" | "python" | "typescript";

/** The request on screen, as code a buyer can paste. Key read from the environment. */
function codeFor(lang: CodeLang, baseUrl: string, model: string, prompt: string): string {
  const content = JSON.stringify(prompt);
  if (lang === "python") {
    return [
      "from openai import OpenAI",
      "",
      `client = OpenAI(base_url="${baseUrl}", api_key=os.environ["ROUTER_API_KEY"])`,
      "",
      "stream = client.chat.completions.create(",
      `    model="${model}",`,
      `    messages=[{"role": "user", "content": ${content}}],`,
      "    stream=True,",
      ")",
      "for chunk in stream:",
      '    print(chunk.choices[0].delta.content or "", end="")',
    ]
      .join("\n")
      .replace("from openai import OpenAI", "import os\nfrom openai import OpenAI");
  }
  if (lang === "typescript") {
    return [
      'import OpenAI from "openai";',
      "",
      `const client = new OpenAI({ baseURL: "${baseUrl}", apiKey: process.env.ROUTER_API_KEY });`,
      "",
      "const stream = await client.chat.completions.create({",
      `  model: "${model}",`,
      `  messages: [{ role: "user", content: ${content} }],`,
      "  stream: true,",
      "});",
      "for await (const chunk of stream) {",
      '  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");',
      "}",
    ].join("\n");
  }
  return [
    `curl ${baseUrl}/chat/completions \\`,
    '  -H "Authorization: Bearer $ROUTER_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    `    "model": "${model}",`,
    `    "messages": [{ "role": "user", "content": ${content.replace(/'/g, "'\\''")} }],`,
    '    "stream": true',
    "  }'",
  ].join("\n");
}

export function PlaygroundClient({
  models,
  initialModel,
  baseUrl,
  variant = "usage",
}: {
  models: readonly string[];
  initialModel?: string;
  baseUrl: string;
  variant?: "usage" | "embedded";
}) {
  const t = useTranslations("console.playground");
  const tErrors = useTranslations("console.errors");
  const options = useMemo(() => (models.length > 0 ? models : [DEFAULT_PUBLIC_MODEL]), [models]);
  const [model, setModel] = useState(() => initialModel ?? options[0] ?? DEFAULT_PUBLIC_MODEL);
  const [prompt, setPrompt] = useState(() => t("defaultPrompt", { brand: brand.name }));
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [pane, setPane] = useState<"response" | "code">("response");
  const [lang, setLang] = useState<CodeLang>("curl");
  const laneRef = useRef(createRequestLane());

  const patchTurn = useCallback((id: string, patch: Partial<Turn>) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }, []);

  const send = useCallback(async () => {
    const text = prompt.trim();
    if (!text || running) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    const turn: Turn = {
      id,
      prompt: text,
      model,
      answer: "",
      status: "streaming",
      error: null,
      needsKey: false,
      promptTokens: null,
      completionTokens: null,
      requestId: null,
      cost: null,
      currency: "USD",
      settling: false,
    };
    setTurns((current) => [turn, ...current]);
    setRunning(true);

    // A new send supersedes the previous one rather than racing it.
    const signal = laneRef.current.next();

    try {
      const response = await consoleStream(
        "/api/console/v1/chat",
        { model, messages: [{ role: "user", content: text }] },
        signal,
      );
      const requestId = response.headers.get("x-request-id");
      patchTurn(id, { requestId });

      if (!response.body) {
        patchTurn(id, { status: "failed", error: tErrors("upstreamEmpty") });
        return;
      }

      let answer = "";
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;

      for await (const payload of readSseData(response.body)) {
        const chunk = safeParse(payload);
        if (chunk === null) continue;

        const streamedError = readRecord(chunk).error;
        if (streamedError !== undefined) {
          // A relayed 200 can still carry a failure mid-stream. It is not a
          // reply and must not be rendered as one.
          const record = readRecord(streamedError);
          patchTurn(id, {
            status: "failed",
            error: readString(record.message, tErrors("upstreamInterrupted")),
            answer,
          });
          return;
        }

        const delta = deltaText(chunk);
        if (delta) {
          answer += delta;
          patchTurn(id, { answer });
        }
        const usage = usageOf(chunk);
        if (usage) {
          promptTokens = usage.promptTokens;
          completionTokens = usage.completionTokens;
        }
      }

      patchTurn(id, {
        status: "done",
        answer,
        promptTokens,
        completionTokens,
        settling: requestId !== null,
      });

      if (requestId) {
        const charge = await lookUpCharge(requestId);
        patchTurn(id, {
          settling: false,
          ...(charge ? { cost: charge.cost, currency: charge.currency } : {}),
        });
      }
    } catch (error) {
      if (isAbortError(error)) {
        patchTurn(id, { status: "cancelled" });
        return;
      }
      patchTurn(id, {
        status: "failed",
        error: describeError(error, tErrors),
        needsKey: error instanceof ConsoleError && error.code === "no_active_key",
        settling: false,
      });
    } finally {
      setRunning(false);
    }
  }, [model, prompt, running, patchTurn, tErrors]);

  const stop = () => {
    laneRef.current.cancel();
    laneRef.current = createRequestLane();
    setRunning(false);
  };

  const tall = variant === "usage";
  const code = codeFor(
    lang,
    baseUrl,
    model,
    prompt.trim() || t("defaultPrompt", { brand: brand.name }),
  );

  return (
    <div
      className={
        tall
          ? "grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          : "grid gap-6 lg:grid-cols-2"
      }
    >
      <section
        aria-label={t("request")}
        className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm"
      >
        <div className="flex h-11 items-center border-b border-border px-4">
          <h2 className="text-sm font-medium">{t("request")}</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <Select
            label={t("model")}
            id="router-model"
            className="font-mono"
            value={model}
            onValueChange={(value) => {
              if (value) setModel(value);
            }}
            options={options.map((candidate) => ({ value: candidate, label: candidate }))}
          />
          <Textarea
            label={t("message")}
            id="router-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send();
              }
            }}
            rows={tall ? 12 : 8}
            className={tall ? "min-h-[200px] flex-1 text-sm" : "min-h-[160px] text-sm"}
          />
          <div className="flex flex-wrap items-center gap-3">
            {running ? (
              <Button type="button" variant="outline" onClick={stop}>
                {t("stop")}
              </Button>
            ) : (
              <Button type="button" disabled={prompt.trim() === ""} onClick={() => void send()}>
                {t("send")}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{t("billingNote")}</span>
          </div>
        </div>
      </section>

      <section
        aria-label={t("reply")}
        className="flex min-h-[320px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm lg:min-h-0"
      >
        <div className="flex h-11 items-center justify-between gap-3 border-b border-border pr-2 pl-1">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            aria-label={t("paneLabel")}
            value={pane}
            onValueChange={(value) => {
              if (value === "response" || value === "code") setPane(value);
            }}
            className="border-0 p-0"
          >
            <ToggleGroupItem value="response" className="border-0 text-sm">
              {t("reply")}
            </ToggleGroupItem>
            <ToggleGroupItem value="code" className="border-0 text-sm">
              {t("code")}
            </ToggleGroupItem>
          </ToggleGroup>
          {pane === "code" ? (
            <div className="flex items-center gap-1">
              <ToggleGroup
                type="single"
                size="sm"
                aria-label={t("language")}
                value={lang}
                onValueChange={(value) => {
                  if (value === "curl" || value === "python" || value === "typescript")
                    setLang(value);
                }}
                className="p-0.5"
              >
                <ToggleGroupItem value="curl" className="h-7 px-2 text-xs">
                  cURL
                </ToggleGroupItem>
                <ToggleGroupItem value="python" className="h-7 px-2 text-xs">
                  Python
                </ToggleGroupItem>
                <ToggleGroupItem value="typescript" className="h-7 px-2 text-xs">
                  TypeScript
                </ToggleGroupItem>
              </ToggleGroup>
              <CopyButton value={code} label={t("copy")} copiedLabel={t("copied")} size="sm" />
            </div>
          ) : (
            <span className="truncate font-mono text-xs text-muted-foreground">{model}</span>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {pane === "code" ? (
            <pre className="p-4 font-mono text-xs leading-relaxed text-foreground">
              <code>{code}</code>
            </pre>
          ) : turns.length === 0 ? (
            <div className="relative flex h-full min-h-[18rem] items-center justify-center p-6">
              {/* Ghost reply: the shape the answer will take, so the pane is never a void. */}
              <div aria-hidden className="absolute inset-x-6 top-6 space-y-2.5 opacity-60">
                <span className="block h-2.5 w-24 rounded-full bg-muted" />
                <span className="block h-2.5 w-11/12 rounded-full bg-muted" />
                <span className="block h-2.5 w-4/5 rounded-full bg-muted" />
                <span className="block h-2.5 w-2/3 rounded-full bg-muted" />
              </div>
              <div className="relative rounded-[var(--radius-xl)] border border-border bg-card/90 px-5 py-4 text-center shadow-glass-sm backdrop-blur">
                <p className="text-sm font-medium">{t("emptyTitle")}</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {t("emptyDescription")}
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {turns.map((turn) => (
                <li key={turn.id} className="p-4">
                  <TurnView turn={turn} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const t = useTranslations("console.playground");
  const tErrors = useTranslations("console.errors");
  return (
    <>
      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{turn.prompt}</p>
      {turn.status === "failed" ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-destructive/35 bg-destructive/8 px-2.5 py-2 text-xs text-destructive-strong"
        >
          {turn.error ?? tErrors("requestFailed")}
          {turn.needsKey ? (
            <>
              {" "}
              <Link href="/keys" className="underline underline-offset-2">
                {t("createKey")}
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {turn.answer}
          {turn.status === "streaming" ? (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-neutral-9" />
          ) : null}
        </pre>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums">
        <span>{turn.model}</span>
        {turn.status === "cancelled" ? <span>{t("stopped")}</span> : null}
        {turn.promptTokens !== null && turn.completionTokens !== null ? (
          <span>
            {t("tokens", {
              input: formatTokens(turn.promptTokens),
              output: formatTokens(turn.completionTokens),
            })}
          </span>
        ) : null}
        {turn.cost !== null ? (
          <span className="font-medium text-foreground">
            {formatAmount(turn.cost)} {turn.currency}
          </span>
        ) : turn.settling ? (
          <span>{t("settling")}</span>
        ) : null}
        {turn.requestId ? <span>{turn.requestId.slice(0, 8)}</span> : null}
      </p>
    </>
  );
}

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** OpenAI streams `choices[0].delta.content`; a final chunk has no delta. */
function deltaText(chunk: unknown): string {
  const choices = readArray(readRecord(chunk).choices);
  const first = readRecord(choices[0]);
  const delta = readRecord(first.delta);
  return readString(delta.content);
}

function usageOf(chunk: unknown): { promptTokens: number; completionTokens: number } | null {
  const raw = readRecord(chunk).usage;
  if (raw === null || raw === undefined) return null;
  const usage = readRecord(raw);
  return {
    promptTokens: readNumber(usage.prompt_tokens),
    completionTokens: readNumber(usage.completion_tokens),
  };
}

/**
 * What the call actually cost, from the ledger.
 *
 * The charge is written when the relayed body finishes streaming, which is at
 * most a moment after the browser sees the last chunk — so this retries a few
 * times rather than reporting "free" on the first miss. If it never appears the
 * cell stays blank: a wrong number here is worse than no number.
 */
async function lookUpCharge(requestId: string): Promise<{ cost: number; currency: string } | null> {
  const to = new Date(Date.now() + 60_000).toISOString();
  const from = new Date(Date.now() - 10 * 60_000).toISOString();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      const page = await consoleApi.usageRecords({ from, to, limit: 20 });
      const row = page.rows.find((candidate) => candidate.requestId === requestId);
      if (row) return { cost: row.totalCost, currency: row.currency };
    } catch {
      return null;
    }
  }
  return null;
}
