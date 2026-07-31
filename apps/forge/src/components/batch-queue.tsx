"use client";

/**
 * Processor batch surface UI — shared by tools with `batch` metadata.
 * Polls GET /api/v1/batches/:id; never inlines sibling failure isolation.
 */
import { Button } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useRef, useState } from "react";
import { RunnerError, RunnerNote, RunnerPanel } from "@/components/runner-ui";

export type BatchAccept = "files" | "lines";
export type BatchResultKind = "file" | "json";

export interface BatchQueueProps {
  toolId: string;
  accept: BatchAccept;
  resultKind: BatchResultKind;
  maxItems?: number;
  /** Build tool input from one raw file or line. */
  buildItemInput: (raw: File | string) => unknown | Promise<unknown>;
  /** Optional shared options applied to every item (e.g. image quality). */
  sharedHint?: string;
  className?: string;
}

type ItemStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

interface AggregateResponse {
  id: string;
  status: "running" | "succeeded" | "partial" | "failed";
  resultKind: BatchResultKind;
  counts: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  items: Array<{
    id: string;
    index: number;
    label: string;
    status: ItemStatus;
    error?: string;
  }>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

export function BatchQueue({
  toolId,
  accept,
  resultKind,
  maxItems = 50,
  buildItemInput,
  sharedHint,
  className,
}: BatchQueueProps) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [aggregate, setAggregate] = useState<AggregateResponse | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paste, setPaste] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  /** Keep inputs for retry */
  const inputByIndex = useRef<Map<number, unknown>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/v1/batches/${id}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        const body = (await res.json()) as AggregateResponse;
        setAggregate(body);
        if (body.status !== "running") stopPoll();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [stopPoll],
  );

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startPoll = useCallback(
    (id: string) => {
      stopPoll();
      void poll(id);
      pollRef.current = setInterval(() => void poll(id), 1000);
    },
    [poll, stopPoll],
  );

  const submitItems = async (raws: Array<File | string>, labels: string[]) => {
    if (raws.length === 0) {
      setError("Add at least one item");
      return;
    }
    if (raws.length > maxItems) {
      setError(`Max ${maxItems} items per batch`);
      return;
    }
    setSubmitting(true);
    setError("");
    setAggregate(null);
    inputByIndex.current = new Map();
    try {
      const items: Array<{ label: string; input: unknown }> = [];
      for (let i = 0; i < raws.length; i++) {
        const input = await buildItemInput(raws[i]!);
        inputByIndex.current.set(i, input);
        items.push({ label: labels[i] ?? `#${i + 1}`, input });
      }
      const res = await fetch("/api/v1/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, items }),
      });
      const body = (await res.json()) as {
        batchId?: string;
        error?: string;
        message?: string;
        maxItems?: number;
      };
      if (!res.ok) {
        setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        return;
      }
      if (!body.batchId) {
        setError("missing_batch_id");
        return;
      }
      setBatchId(body.batchId);
      // Persist id in URL for refresh resume
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("batch", body.batchId);
        window.history.replaceState({}, "", url.toString());
      }
      startPoll(body.batchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setPendingFiles(Array.from(list).slice(0, maxItems));
  };

  const runFiles = () => {
    void submitItems(
      pendingFiles,
      pendingFiles.map((f) => f.name),
    );
  };

  const runLines = () => {
    const lines = paste
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, maxItems);
    void submitItems(
      lines,
      lines.map((l, i) => l.slice(0, 40) || `#${i + 1}`),
    );
  };

  const retryItem = async (item: AggregateResponse["items"][number]) => {
    if (!batchId) return;
    const input = inputByIndex.current.get(item.index);
    if (input === undefined) {
      setError("Retry needs original input still in this session");
      return;
    }
    setError("");
    try {
      const res = await fetch(`/api/v1/batches/${batchId}/items/${item.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        return;
      }
      startPoll(batchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const downloadZip = () => {
    if (!batchId || resultKind !== "file") return;
    window.open(`/api/v1/batches/${batchId}/download`, "_blank");
  };

  // Resume from ?batch=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URL(window.location.href).searchParams.get("batch");
    if (id && !batchId) {
      setBatchId(id);
      startPoll(id);
    }
  }, [batchId, startPoll]);

  const c = aggregate?.counts;
  const terminal =
    aggregate &&
    (aggregate.status === "succeeded" ||
      aggregate.status === "partial" ||
      aggregate.status === "failed");

  return (
    <div className={["flex flex-col gap-4", className].filter(Boolean).join(" ")}>
      <RunnerNote>
        Batch queue — up to {maxItems} items. Each item runs independently; one failure does not
        cancel siblings.
        {sharedHint ? ` ${sharedHint}` : null}
      </RunnerNote>

      {accept === "files" ? (
        <RunnerPanel title="Files">
          <input
            data-allow-native
            type="file"
            multiple
            className="block w-full text-sm"
            onChange={(e) => onFiles(e.target.files)}
          />
          <p className="mt-2 text-xs text-[var(--neutral-10)]">
            {pendingFiles.length} file(s) selected
          </p>
          <Button
            type="button"
            className="mt-3"
            disabled={submitting || pendingFiles.length === 0}
            onClick={runFiles}
          >
            {submitting ? "Submitting…" : "Run batch"}
          </Button>
        </RunnerPanel>
      ) : (
        <RunnerPanel title="Lines">
          <textarea
            data-allow-native
            className="min-h-[140px] w-full rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3 font-mono text-sm"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="One item per line"
          />
          <Button
            type="button"
            className="mt-3"
            disabled={submitting || !paste.trim()}
            onClick={runLines}
          >
            {submitting ? "Submitting…" : "Run batch"}
          </Button>
        </RunnerPanel>
      )}

      <RunnerError>{error}</RunnerError>

      {aggregate ? (
        <RunnerPanel title={`Batch ${aggregate.id.slice(0, 8)}… · ${aggregate.status}`}>
          {c ? (
            <p className="mb-3 text-sm text-[var(--neutral-11)]">
              Processed {c.succeeded + c.failed + c.skipped}/{c.total}
              {c.running + c.queued > 0 ? ` · in flight ${c.running + c.queued}` : ""}
              {c.succeeded ? ` · ok ${c.succeeded}` : ""}
              {c.failed ? ` · failed ${c.failed}` : ""}
              {c.skipped ? ` · skipped ${c.skipped}` : ""}
            </p>
          ) : null}

          <ul className="flex flex-col gap-2">
            {aggregate.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--neutral-6)] px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {item.index + 1}. {item.label}
                </span>
                <span className="text-xs text-[var(--neutral-10)]">{item.status}</span>
                {item.error ? (
                  <span className="w-full text-xs text-[var(--status-danger)]">{item.error}</span>
                ) : null}
                {(item.status === "failed" || item.status === "skipped") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void retryItem(item)}
                  >
                    Retry
                  </Button>
                )}
                {item.status === "succeeded" && resultKind === "file" ? (
                  <a
                    className="text-xs text-[hsl(var(--primary))] underline"
                    href={`/api/v1/jobs/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Job JSON
                  </a>
                ) : null}
              </li>
            ))}
          </ul>

          {terminal && resultKind === "file" && (c?.succeeded ?? 0) > 0 ? (
            <Button type="button" className="mt-3" onClick={downloadZip}>
              Download all (.zip)
            </Button>
          ) : null}
        </RunnerPanel>
      ) : null}
    </div>
  );
}

/** Helper for image batch items. */
export async function imageFileToBatchInput(
  file: File,
  opts: { format: string; quality: number; width?: number; height?: number },
): Promise<Record<string, unknown>> {
  const imageBase64 = await fileToDataUrl(file);
  return {
    imageBase64,
    format: opts.format,
    quality: opts.quality,
    ...(opts.width ? { width: opts.width } : {}),
    ...(opts.height ? { height: opts.height } : {}),
  };
}
