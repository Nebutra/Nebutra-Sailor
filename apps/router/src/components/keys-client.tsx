"use client";

import { Check, Copy, Trash } from "@nebutra/icons";
import {
  Badge,
  Button,
  ConfirmDialog,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AsyncSection, SkeletonRows } from "@/components/console-states";
import { type ApiKeyRow, type ApiKeyStatus, consoleApi } from "@/lib/console-api";
import { describeError } from "@/lib/console-client";
import {
  endOfUtcDayIso,
  formatAmount,
  formatDate,
  formatDateTime,
  parseOptionalPositive,
  toDateInputValue,
} from "@/lib/console-format";
import { useConsoleResource } from "@/lib/use-console-resource";

/**
 * Key management.
 *
 * Every mutation here is optimistic and every optimistic write keeps the list
 * it replaced, so a failed call puts the old row back and says why. The
 * previous version had one `loading` boolean for the whole table — disabling a
 * key greyed out every other key's button — and threw away the result of
 * `revoke()` entirely, so a refused revocation looked exactly like a successful
 * one until the page was reloaded.
 */

const STATUS_LABEL: Record<ApiKeyStatus, string> = {
  active: "启用中",
  disabled: "已停用",
  expired: "已过期",
  revoked: "已吊销",
};

/** Four statuses, four colours — the word alone is easy to skim past. */
const STATUS_TONE: Record<
  ApiKeyStatus,
  "green-subtle" | "gray-subtle" | "amber-subtle" | "red-subtle"
> = {
  active: "green-subtle",
  disabled: "gray-subtle",
  expired: "amber-subtle",
  revoked: "red-subtle",
};

interface Notice {
  tone: "success" | "error";
  text: string;
}

export function KeysClient() {
  const { resource, reload, set } = useConsoleResource<ApiKeyRow[]>("keys", (signal) =>
    consoleApi.listKeys(signal),
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [issued, setIssued] = useState<{ id: string; fullKey: string } | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ApiKeyRow | null>(null);

  const rows = resource.data ?? [];

  const markPending = useCallback((id: string, label: string | null) => {
    setPending((current) => {
      if (label === null) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: label };
    });
  }, []);

  /**
   * Apply `next` immediately, run `call`, and put `rows` back if it fails.
   * The rollback is the whole point: without it an optimistic UI is just a UI
   * that lies faster.
   */
  const mutate = useCallback(
    async (id: string, label: string, next: ApiKeyRow[], call: () => Promise<void>) => {
      const previous = rows;
      setNotice(null);
      markPending(id, label);
      set(next);
      try {
        await call();
      } catch (error) {
        set(previous);
        setNotice({ tone: "error", text: describeError(error) });
      } finally {
        markPending(id, null);
      }
    },
    [rows, set, markPending],
  );

  const patch = useCallback(
    async (row: ApiKeyRow, label: string, changes: Partial<ApiKeyRow>, body: PatchBody) => {
      const merged = { ...row, ...changes };
      await mutate(
        row.id,
        label,
        rows.map((candidate) => (candidate.id === row.id ? merged : candidate)),
        async () => {
          const updated = await consoleApi.patchKey(row.id, body);
          // The server is the authority on `status` and the spend counters.
          set(rows.map((candidate) => (candidate.id === row.id ? updated : candidate)));
        },
      );
    },
    [mutate, rows, set],
  );

  const revoke = useCallback(
    async (row: ApiKeyRow) => {
      await mutate(
        row.id,
        "吊销中",
        rows.filter((candidate) => candidate.id !== row.id),
        async () => {
          await consoleApi.revokeKey(row.id);
          setNotice({ tone: "success", text: `已吊销 ${row.name}，这把 Key 立即失效。` });
        },
      );
    },
    [mutate, rows],
  );

  return (
    <div className="space-y-3">
      <CreateKeyForm
        onCreated={(key) => {
          setIssued({ id: key.id, fullKey: key.fullKey });
          const { fullKey: _fullKey, ...row } = key;
          set([row, ...rows]);
          setNotice({ tone: "success", text: `已创建 ${row.name}。` });
        }}
        onFailed={(message) => setNotice({ tone: "error", text: message })}
      />

      {issued ? <RevealOnce fullKey={issued.fullKey} onDismiss={() => setIssued(null)} /> : null}

      {notice ? <NoticeLine notice={notice} /> : null}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
        <AsyncSection
          resource={resource}
          onRetry={reload}
          isEmpty={(data) => data.length === 0}
          emptyTitle="这个账号下还没有 Key"
          emptyDescription="创建一把 Key 才能调用 /v1，密钥原文只在创建时显示一次。"
          skeleton={<SkeletonRows rows={3} columns={5} />}
        >
          {(data) => (
            <Table bare className="w-full min-w-[720px] text-[12px]">
              <TableHeader>
                <TableRow className="bg-[var(--neutral-2)]/50 text-[11px] text-[var(--neutral-10)]">
                  <TableHead alignment="start" className="font-medium">
                    名称
                  </TableHead>
                  <TableHead alignment="start" className="font-medium">
                    前缀
                  </TableHead>
                  <TableHead alignment="start" className="font-medium">
                    状态
                  </TableHead>
                  <TableHead alignment="end" className="font-medium">
                    今日 / 累计
                  </TableHead>
                  <TableHead alignment="end" className="font-medium">
                    速率
                  </TableHead>
                  <TableHead alignment="start" className="font-medium">
                    过期
                  </TableHead>
                  <TableHead alignment="end" className="font-medium">
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody bordered>
                {data.map((row) => {
                  const busy = pending[row.id];
                  return (
                    <KeyRowView
                      key={row.id}
                      row={row}
                      busy={busy ?? null}
                      expanded={editing === row.id}
                      onToggleEdit={() => setEditing((id) => (id === row.id ? null : row.id))}
                      onToggleDisabled={() =>
                        void patch(
                          row,
                          row.status === "disabled" ? "启用中" : "停用中",
                          { status: row.status === "disabled" ? "active" : "disabled" },
                          { disabled: row.status !== "disabled" },
                        )
                      }
                      onSave={(changes, body) => {
                        setEditing(null);
                        void patch(row, "保存中", changes, body);
                      }}
                      onRevoke={() => setConfirming(row)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </AsyncSection>
      </div>

      <p className="text-[11px] text-[var(--neutral-10)]">
        停用可以随时恢复；吊销不可撤销。用量与花费见{" "}
        <Link href="/usage" className="underline underline-offset-2">
          用量
        </Link>
        。
      </p>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        variant="destructive"
        title={`吊销 ${confirming?.name ?? ""}`}
        description="吊销后这把 Key 立刻失效，且无法恢复。正在使用它的程序会收到 401。想临时暂停请改用「停用」。"
        confirmText="确认吊销"
        cancelText="取消"
        onConfirm={async () => {
          const target = confirming;
          setConfirming(null);
          if (target) await revoke(target);
        }}
      />
    </div>
  );
}

interface PatchBody {
  name?: string;
  rateLimitRps?: number;
  disabled?: boolean;
  saveLogs?: boolean;
  expiresAt?: string | null;
  limits?: { total?: number | null; daily?: number | null };
}

function NoticeLine({ notice }: { notice: Notice }) {
  const error = notice.tone === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      className={[
        "rounded-[var(--radius-md)] border px-3 py-2 text-[12px]",
        error
          ? "border-[color-mix(in_srgb,var(--status-danger)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-danger)_8%,var(--neutral-1))] text-[var(--status-danger)]"
          : "border-[color-mix(in_srgb,var(--status-success)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-success)_8%,var(--neutral-1))] text-[var(--status-success)]",
      ].join(" ")}
    >
      {notice.text}
    </p>
  );
}

function RevealOnce({ fullKey, onDismiss }: { fullKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--status-warning)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-warning)_8%,var(--neutral-1))] p-3">
      <p className="text-[12px] font-semibold">只显示这一次 · 关掉就再也读不到了</p>
      <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2 font-mono text-[11px]">
        {fullKey}
      </pre>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => {
            void navigator.clipboard
              .writeText(fullKey)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
          {copied ? "已复制" : "复制"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onDismiss}>
          我已保存
        </Button>
      </div>
    </div>
  );
}

function CreateKeyForm({
  onCreated,
  onFailed,
}: {
  onCreated: (key: ApiKeyRow & { fullKey: string }) => void;
  onFailed: (message: string) => void;
}) {
  const [name, setName] = useState("default");
  const [rate, setRate] = useState("");
  const [daily, setDaily] = useState("");
  const [total, setTotal] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "给这把 Key 起个名字，便于以后对账。";
    const parsedRate = parseOptionalPositive(rate, { max: 1000, integer: true });
    if (!parsedRate.ok) nextErrors.rate = parsedRate.message;
    const parsedDaily = parseOptionalPositive(daily, { max: 1_000_000 });
    if (!parsedDaily.ok) nextErrors.daily = parsedDaily.message;
    const parsedTotal = parseOptionalPositive(total, { max: 1_000_000 });
    if (!parsedTotal.ok) nextErrors.total = parsedTotal.message;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!parsedRate.ok || !parsedDaily.ok || !parsedTotal.ok) return;

    setCreating(true);
    try {
      const created = await consoleApi.createKey({
        name: name.trim(),
        ...(parsedRate.value !== null ? { rateLimitRps: parsedRate.value } : {}),
        ...(parsedDaily.value !== null || parsedTotal.value !== null
          ? { limits: { daily: parsedDaily.value, total: parsedTotal.value } }
          : {}),
      });
      onCreated(created);
      setName("default");
      setRate("");
      setDaily("");
      setTotal("");
    } catch (error) {
      onFailed(describeError(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem_auto] sm:items-end">
      <Input
        label="名称"
        id="key-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="default"
        {...(errors.name ? { error: errors.name } : {})}
      />
      <Input
        label="速率 (req/s)"
        id="key-rate"
        type="number"
        min={1}
        value={rate}
        onChange={(event) => setRate(event.target.value)}
        placeholder="不限"
        {...(errors.rate ? { error: errors.rate } : {})}
      />
      <Input
        label="每日上限 $"
        id="key-daily"
        type="number"
        min={0}
        value={daily}
        onChange={(event) => setDaily(event.target.value)}
        placeholder="不限"
        {...(errors.daily ? { error: errors.daily } : {})}
      />
      <Input
        label="累计上限 $"
        id="key-total"
        type="number"
        min={0}
        value={total}
        onChange={(event) => setTotal(event.target.value)}
        placeholder="不限"
        {...(errors.total ? { error: errors.total } : {})}
      />
      <Button
        type="button"
        variant="ink"
        size="sm"
        className="h-9"
        disabled={creating}
        onClick={() => void submit()}
      >
        {creating ? "创建中…" : "创建 Key"}
      </Button>
    </div>
  );
}

function KeyRowView({
  row,
  busy,
  expanded,
  onToggleEdit,
  onToggleDisabled,
  onSave,
  onRevoke,
}: {
  row: ApiKeyRow;
  busy: string | null;
  expanded: boolean;
  onToggleEdit: () => void;
  onToggleDisabled: () => void;
  onSave: (changes: Partial<ApiKeyRow>, body: PatchBody) => void;
  onRevoke: () => void;
}) {
  return (
    <>
      <TableRow className="hover:bg-[var(--neutral-2)]/40">
        <TableCell alignment="start" className="font-medium">
          {row.name}
          <span className="ml-2 font-normal text-[10px] text-[var(--neutral-9)]">
            {formatDate(row.createdAt)} 创建
          </span>
        </TableCell>
        <TableCell alignment="start" className="font-mono text-[11px] text-[var(--neutral-11)]">
          {row.keyPrefix}…
        </TableCell>
        <TableCell alignment="start">
          <Badge variant={STATUS_TONE[row.status]} size="sm">
            {STATUS_LABEL[row.status]}
          </Badge>
        </TableCell>
        <TableCell alignment="end" className="tabular-nums text-[11px]">
          {formatAmount(row.cost.daily)}
          {row.limits.daily === null ? "" : ` / ${formatAmount(row.limits.daily)}`}
          <span className="text-[var(--neutral-9)]"> · </span>
          {formatAmount(row.cost.total)}
          {row.limits.total === null ? "" : ` / ${formatAmount(row.limits.total)}`}
        </TableCell>
        <TableCell alignment="end" className="tabular-nums text-[11px]">
          {row.rateLimitRps} r/s
        </TableCell>
        <TableCell alignment="start" className="text-[11px] text-[var(--neutral-10)]">
          {row.expiresAt ? formatDateTime(row.expiresAt) : "长期有效"}
        </TableCell>
        <TableCell alignment="end">
          <div className="flex items-center justify-end gap-1">
            {busy ? (
              <span className="mr-1 text-[11px] text-[var(--neutral-10)]">{busy}…</span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={busy !== null}
              aria-expanded={expanded}
              onClick={onToggleEdit}
            >
              {expanded ? "收起" : "编辑"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              disabled={busy !== null}
              onClick={onToggleDisabled}
            >
              {row.status === "disabled" ? "启用" : "停用"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[var(--status-danger)]"
              disabled={busy !== null}
              aria-label={`吊销 ${row.name}`}
              onClick={onRevoke}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={7} alignment="start" className="bg-[var(--neutral-2)]/40 p-3">
            <KeyEditor row={row} onSave={onSave} onCancel={onToggleEdit} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function KeyEditor({
  row,
  onSave,
  onCancel,
}: {
  row: ApiKeyRow;
  onSave: (changes: Partial<ApiKeyRow>, body: PatchBody) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [rate, setRate] = useState(String(row.rateLimitRps));
  const [daily, setDaily] = useState(row.limits.daily === null ? "" : String(row.limits.daily));
  const [total, setTotal] = useState(row.limits.total === null ? "" : String(row.limits.total));
  const [expires, setExpires] = useState(toDateInputValue(row.expiresAt));
  const [saveLogs, setSaveLogs] = useState(row.saveLogs);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "名称不能为空。";
    const parsedRate = parseOptionalPositive(rate, { max: 1000, integer: true });
    if (!parsedRate.ok) nextErrors.rate = parsedRate.message;
    const parsedDaily = parseOptionalPositive(daily, { max: 1_000_000 });
    if (!parsedDaily.ok) nextErrors.daily = parsedDaily.message;
    const parsedTotal = parseOptionalPositive(total, { max: 1_000_000 });
    if (!parsedTotal.ok) nextErrors.total = parsedTotal.message;
    const expiresAt = expires.trim() ? endOfUtcDayIso(expires) : null;
    if (expires.trim() && expiresAt === null) nextErrors.expires = "日期格式应为 2026-10-01。";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!parsedRate.ok || !parsedDaily.ok || !parsedTotal.ok) return;

    onSave(
      {
        name: name.trim(),
        rateLimitRps: parsedRate.value ?? row.rateLimitRps,
        limits: { daily: parsedDaily.value, total: parsedTotal.value },
        expiresAt,
        saveLogs,
      },
      {
        name: name.trim(),
        ...(parsedRate.value !== null ? { rateLimitRps: parsedRate.value } : {}),
        limits: { daily: parsedDaily.value, total: parsedTotal.value },
        expiresAt,
        saveLogs,
      },
    );
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_6rem_9rem] sm:items-end">
      <Input
        label="名称"
        id={`edit-name-${row.id}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        {...(errors.name ? { error: errors.name } : {})}
      />
      <Input
        label="速率 (req/s)"
        id={`edit-rate-${row.id}`}
        type="number"
        min={1}
        value={rate}
        onChange={(event) => setRate(event.target.value)}
        {...(errors.rate ? { error: errors.rate } : {})}
      />
      <Input
        label="每日上限 $"
        id={`edit-daily-${row.id}`}
        type="number"
        min={0}
        value={daily}
        onChange={(event) => setDaily(event.target.value)}
        placeholder="不限"
        {...(errors.daily ? { error: errors.daily } : {})}
      />
      <Input
        label="累计上限 $"
        id={`edit-total-${row.id}`}
        type="number"
        min={0}
        value={total}
        onChange={(event) => setTotal(event.target.value)}
        placeholder="不限"
        {...(errors.total ? { error: errors.total } : {})}
      />
      <Input
        label="过期日 (UTC)"
        id={`edit-expires-${row.id}`}
        type="date"
        value={expires}
        onChange={(event) => setExpires(event.target.value)}
        {...(errors.expires ? { error: errors.expires } : {})}
      />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          aria-pressed={saveLogs}
          onClick={() => setSaveLogs((value) => !value)}
        >
          保存日志：{saveLogs ? "开" : "关"}
        </Button>
        <span className="text-[11px] text-[var(--neutral-10)]">
          关掉后这把 Key 的请求明细不再记录，账单仍然照常记账。
        </span>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" variant="ink" size="sm" className="h-7" onClick={submit}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
