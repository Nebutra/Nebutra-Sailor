// @brand-exempt: the two literals are the demo JSON documents the diff runner compares.
// Sample payloads, not brand identity.

"use client";

/**
 * Side-by-side JSON Diff UX — competitor pattern (jsoncompare / jsondiff).
 * Path table with kind-colored rows + same invoke path as API.
 */
import { Check, Copy } from "@nebutra/icons";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

async function invoke(
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

type DiffOp = {
  path?: string;
  kind?: string;
  left?: unknown;
  right?: unknown;
};

type KindFilter = "all" | "add" | "remove" | "change" | "type";

function kindRowClass(kind?: string): string {
  switch (kind) {
    case "add":
      return "bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)]";
    case "remove":
      return "bg-[color-mix(in_srgb,var(--status-danger)_12%,transparent)]";
    case "change":
      return "bg-[color-mix(in_srgb,var(--status-warning)_14%,transparent)]";
    case "type":
      return "bg-[color-mix(in_srgb,var(--status-info)_12%,transparent)]";
    default:
      return "";
  }
}

function kindBadgeClass(kind?: string): string {
  switch (kind) {
    case "add":
      return "bg-[color-mix(in_srgb,var(--status-success)_20%,transparent)] text-[var(--status-success)]";
    case "remove":
      return "bg-[color-mix(in_srgb,var(--status-danger)_20%,transparent)] text-[var(--status-danger)]";
    case "change":
      return "bg-[color-mix(in_srgb,var(--status-warning)_22%,transparent)] text-[var(--status-warning)]";
    case "type":
      return "bg-[color-mix(in_srgb,var(--status-info)_20%,transparent)] text-[var(--status-info)]";
    default:
      return "bg-[var(--neutral-3)] text-[var(--neutral-11)]";
  }
}

function preview(value: unknown): string {
  if (value === undefined) return "—";
  try {
    const s = JSON.stringify(value);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return String(value);
  }
}

export function JsonDiffRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [left, setLeft] = useState('{\n  "name": "Nebutra",\n  "tools": 85\n}');
  const [right, setRight] = useState('{\n  "name": "Nebutra",\n  "tools": 139,\n  "wave": "4"\n}');
  const [ops, setOps] = useState<DiffOp[]>([]);
  const [equal, setEqual] = useState<boolean | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<KindFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return ops;
    return ops.filter((o) => o.kind === filter);
  }, [ops, filter]);

  const kindCounts = useMemo(() => {
    const c: Record<string, number> = { add: 0, remove: 0, change: 0, type: 0 };
    for (const op of ops) {
      if (op.kind && op.kind in c) c[op.kind] = (c[op.kind] ?? 0) + 1;
    }
    return c;
  }, [ops]);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invoke(toolId, { left, right });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setEqual(null);
      setOps([]);
      setRaw("");
      return;
    }
    const out = r.output;
    setEqual(Boolean(out.equal));
    setChangeCount(Number(out.changeCount ?? 0));
    setOps(Array.isArray(out.ops) ? (out.ops as DiffOp[]) : []);
    setRaw(JSON.stringify(out, null, 2));
    setFilter("all");
  };

  const filters: { id: KindFilter; label: string }[] = [
    { id: "all", label: t("jsonDiff.filterAll", { count: ops.length }) },
    { id: "add", label: t("jsonDiff.filterAdd", { count: kindCounts.add ?? 0 }) },
    { id: "remove", label: t("jsonDiff.filterRemove", { count: kindCounts.remove ?? 0 }) },
    { id: "change", label: t("jsonDiff.filterChange", { count: kindCounts.change ?? 0 }) },
    { id: "type", label: t("jsonDiff.filterType", { count: kindCounts.type ?? 0 }) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--status-danger)_4%,transparent)] p-1">
          <Textarea
            id="json-diff-left"
            label={t("jsonDiff.left")}
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            rows={14}
            className="border-0 bg-transparent font-mono text-sm shadow-none"
          />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[color-mix(in_srgb,var(--status-success)_4%,transparent)] p-1">
          <Textarea
            id="json-diff-right"
            label={t("jsonDiff.right")}
            value={right}
            onChange={(e) => setRight(e.target.value)}
            rows={14}
            className="border-0 bg-transparent font-mono text-sm shadow-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? t("common.running") : t("common.run")}
        </Button>
        {raw ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(raw);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        ) : null}
        {equal !== null ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              equal
                ? "bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-[var(--status-success)]"
                : "bg-[color-mix(in_srgb,var(--status-warning)_15%,transparent)] text-[var(--status-warning)]"
            }`}
          >
            {equal ? t("jsonDiff.equal") : t("jsonDiff.differs", { count: changeCount })}
          </span>
        ) : null}
      </div>

      <RunnerError>{error}</RunnerError>

      {ops.length > 0 ? (
        <fieldset
          className="flex flex-wrap gap-1.5 border-0 p-0"
          aria-label={t("jsonDiff.filtersAria")}
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === f.id
                  ? "border-primary bg-[var(--blue-3)] text-[var(--neutral-12)]"
                  : "border-[var(--neutral-6)] bg-[var(--neutral-1)] text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </fieldset>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)]">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-[var(--neutral-2)] text-xs text-[var(--neutral-11)]">
              <tr>
                <th className="px-3 py-2 font-medium">{t("jsonDiff.colPath")}</th>
                <th className="px-3 py-2 font-medium">{t("jsonDiff.colKind")}</th>
                <th className="px-3 py-2 font-medium">{t("jsonDiff.colLeft")}</th>
                <th className="px-3 py-2 font-medium">{t("jsonDiff.colRight")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((op, i) => (
                <tr
                  key={`${op.path}-${i}`}
                  className={`border-t border-[var(--neutral-6)] ${kindRowClass(op.kind)}`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-[var(--neutral-12)]">
                    {op.path ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${kindBadgeClass(op.kind)}`}
                    >
                      {op.kind ?? "—"}
                    </span>
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2 font-mono text-xs text-[var(--neutral-11)]">
                    {preview(op.left)}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2 font-mono text-xs text-[var(--neutral-11)]">
                    {preview(op.right)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {raw ? <RunnerOutput>{raw}</RunnerOutput> : null}
      <RunnerNote>{t("jsonDiff.note")}</RunnerNote>
    </div>
  );
}
