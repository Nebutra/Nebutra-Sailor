"use client";

import { brand } from "@nebutra/brand/metadata";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { Button, Select, Textarea } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { StatePanel } from "@/components/console-states";
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
  promptTokens: number | null;
  completionTokens: number | null;
  requestId: string | null;
  cost: number | null;
  currency: string;
  /** True while the ledger row is still being looked up. */
  settling: boolean;
}

export function PlaygroundClient({
  models,
  initialModel,
  variant = "usage",
}: {
  models: readonly string[];
  initialModel?: string;
  variant?: "usage" | "embedded";
}) {
  const options = useMemo(() => (models.length > 0 ? models : [DEFAULT_PUBLIC_MODEL]), [models]);
  const [model, setModel] = useState(() => initialModel ?? options[0] ?? DEFAULT_PUBLIC_MODEL);
  const [prompt, setPrompt] = useState(`用一句话介绍 ${brand.name} Router`);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
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
        patchTurn(id, { status: "failed", error: "上游没有返回内容。" });
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
            error: readString(record.message, "上游中断了这次请求。"),
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
      patchTurn(id, { status: "failed", error: describeError(error), settling: false });
      if (error instanceof ConsoleError && error.code === "no_active_key") {
        patchTurn(id, { error: error.message });
      }
    } finally {
      setRunning(false);
    }
  }, [model, prompt, running, patchTurn]);

  const stop = () => {
    laneRef.current.cancel();
    laneRef.current = createRequestLane();
    setRunning(false);
  };

  const tall = variant === "usage";

  return (
    <div
      className={
        tall
          ? "grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      }
    >
      <div className="flex min-h-0 flex-col space-y-3 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] p-3 md:p-4">
        <Select
          label="模型"
          id="router-model"
          size="small"
          className="font-mono text-[12px]"
          value={model}
          onValueChange={(value) => {
            if (value) setModel(value);
          }}
          options={options.map((candidate) => ({ value: candidate, label: candidate }))}
        />
        <Textarea
          label="消息"
          id="router-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={tall ? 12 : 8}
          className={
            tall
              ? "min-h-[200px] flex-1 font-mono text-[13px]"
              : "min-h-[160px] font-mono text-[12px]"
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ink"
            size="sm"
            className="h-9 px-4"
            disabled={running || prompt.trim() === ""}
            onClick={() => void send()}
          >
            {running ? "请求中…" : "发送"}
          </Button>
          {running ? (
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={stop}>
              停止
            </Button>
          ) : null}
          <span className="text-[11px] text-[var(--neutral-10)]">
            用你账号下最新的一把 Key 计费
          </span>
        </div>
      </div>

      <div className="flex min-h-[240px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-6)] lg:min-h-0">
        <div className="flex items-center justify-between border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/50 px-3 py-2">
          <span className="text-[12px] font-semibold">回复</span>
          <span className="font-mono text-[10px] text-[var(--neutral-10)]">{model}</span>
        </div>
        <div className="flex-1 overflow-auto">
          {turns.length === 0 ? (
            <StatePanel
              title="发一条消息，回复会流式出现在这里"
              description="每次调用都会走计费边缘，结束后这里会显示它花了多少。"
            />
          ) : (
            <ul className="divide-y divide-[var(--neutral-6)]">
              {turns.map((turn) => (
                <li key={turn.id} className="p-3">
                  <TurnView turn={turn} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  return (
    <>
      <p className="mb-1.5 line-clamp-2 text-[11px] text-[var(--neutral-10)]">{turn.prompt}</p>
      {turn.status === "failed" ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--status-danger)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-danger)_8%,var(--neutral-1))] px-2.5 py-2 text-[12px] text-[var(--status-danger)]"
        >
          {turn.error ?? "这次请求失败了。"}
          {turn.error?.includes("Key") ? (
            <>
              {" "}
              <Link href="/keys" className="underline underline-offset-2">
                去创建 Key
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[var(--neutral-12)]">
          {turn.answer}
          {turn.status === "streaming" ? (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[var(--neutral-9)]" />
          ) : null}
        </pre>
      )}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--neutral-10)]">
        <span>{turn.model}</span>
        {turn.status === "cancelled" ? <span>已停止</span> : null}
        {turn.promptTokens !== null && turn.completionTokens !== null ? (
          <span>
            入 {formatTokens(turn.promptTokens)} · 出 {formatTokens(turn.completionTokens)}
          </span>
        ) : null}
        {turn.cost !== null ? (
          <span className="font-semibold text-[var(--neutral-12)]">
            {formatAmount(turn.cost)} {turn.currency}
          </span>
        ) : turn.settling ? (
          <span>结算中…</span>
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
