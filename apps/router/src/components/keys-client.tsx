"use client";

import { Check, Copy, Trash } from "@nebutra/icons";
import {
  Badge,
  Button,
  ConfirmDialog,
  Input,
  NumberField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("console.keys");
  const tErrors = useTranslations("console.errors");
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
        setNotice({ tone: "error", text: describeError(error, tErrors) });
      } finally {
        markPending(id, null);
      }
    },
    [rows, set, markPending, tErrors],
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
        t("pending.revoking"),
        rows.filter((candidate) => candidate.id !== row.id),
        async () => {
          await consoleApi.revokeKey(row.id);
          setNotice({ tone: "success", text: t("notice.revoked", { name: row.name }) });
        },
      );
    },
    [mutate, rows, t],
  );

  return (
    <div className="space-y-3">
      <CreateKeyForm
        onCreated={(key) => {
          setIssued({ id: key.id, fullKey: key.fullKey });
          const { fullKey: _fullKey, ...row } = key;
          set([row, ...rows]);
          setNotice({ tone: "success", text: t("notice.created", { name: row.name }) });
        }}
        onFailed={(message) => setNotice({ tone: "error", text: message })}
      />

      {issued ? <RevealOnce fullKey={issued.fullKey} onDismiss={() => setIssued(null)} /> : null}

      {notice ? <NoticeLine notice={notice} /> : null}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-neutral-6">
        <AsyncSection
          resource={resource}
          onRetry={reload}
          isEmpty={(data) => data.length === 0}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
          skeleton={<SkeletonRows rows={3} columns={5} />}
        >
          {(data) => (
            <Table bare className="w-full min-w-[720px] text-xs">
              <TableHeader>
                <TableRow className="bg-neutral-2/50 text-xs text-muted-foreground">
                  <TableHead alignment="start" className="font-medium">
                    {t("col.name")}
                  </TableHead>
                  <TableHead alignment="start" className="font-medium">
                    {t("col.prefix")}
                  </TableHead>
                  <TableHead alignment="start" className="font-medium">
                    {t("col.status")}
                  </TableHead>
                  <TableHead alignment="end" className="font-medium">
                    {t("col.spend")}
                  </TableHead>
                  <TableHead alignment="end" className="font-medium">
                    {t("col.rate")}
                  </TableHead>
                  <TableHead alignment="start" className="font-medium">
                    {t("col.expires")}
                  </TableHead>
                  <TableHead alignment="end" className="font-medium">
                    <span className="sr-only">{t("col.actions")}</span>
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
                          row.status === "disabled"
                            ? t("pending.enabling")
                            : t("pending.disabling"),
                          { status: row.status === "disabled" ? "active" : "disabled" },
                          { disabled: row.status !== "disabled" },
                        )
                      }
                      onSave={(changes, body) => {
                        setEditing(null);
                        void patch(row, t("pending.saving"), changes, body);
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

      <p className="text-xs text-muted-foreground">
        {t.rich("footer", {
          link: (chunks) => (
            <Link href="/usage" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        variant="destructive"
        title={t("confirm.title", { name: confirming?.name ?? "" })}
        description={t("confirm.description")}
        confirmText={t("confirm.confirm")}
        cancelText={t("confirm.cancel")}
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
        "rounded-[var(--radius-md)] border px-3 py-2 text-xs",
        error
          ? "border-destructive/35 bg-destructive/8 text-destructive-strong"
          : "border-success/35 bg-success/8 text-success-strong",
      ].join(" ")}
    >
      {notice.text}
    </p>
  );
}

function RevealOnce({ fullKey, onDismiss }: { fullKey: string; onDismiss: () => void }) {
  const t = useTranslations("console.keys.reveal");
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[var(--radius-md)] border border-warning/35 bg-warning/8 p-3">
      <p className="text-xs font-semibold">{t("title")}</p>
      <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-1 p-2 font-mono text-xs">
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
          {copied ? t("copied") : t("copy")}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onDismiss}>
          {t("saved")}
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
  const t = useTranslations("console.keys.form");
  const tErrors = useTranslations("console.errors");
  const [name, setName] = useState("default");
  const [rate, setRate] = useState("");
  const [daily, setDaily] = useState("");
  const [total, setTotal] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = t("nameRequired");
    const parsedRate = parseOptionalPositive(rate, { max: 1000, integer: true });
    if (!parsedRate.ok) nextErrors.rate = tErrors(parsedRate.error.key, parsedRate.error.values);
    const parsedDaily = parseOptionalPositive(daily, { max: 1_000_000 });
    if (!parsedDaily.ok)
      nextErrors.daily = tErrors(parsedDaily.error.key, parsedDaily.error.values);
    const parsedTotal = parseOptionalPositive(total, { max: 1_000_000 });
    if (!parsedTotal.ok)
      nextErrors.total = tErrors(parsedTotal.error.key, parsedTotal.error.values);
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
      onFailed(describeError(error, tErrors));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-2 rounded-[var(--radius-md)] border border-neutral-6 p-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem_auto] sm:items-end">
      <Input
        label={t("name")}
        id="key-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="default"
        {...(errors.name ? { error: errors.name } : {})}
      />
      <NumberField
        label={t("rate")}
        id="key-rate"
        min={1}
        value={rate}
        onValueChange={(value) => setRate(value == null ? "" : String(value))}
        placeholder={t("unlimited")}
        {...(errors.rate ? { error: errors.rate } : {})}
      />
      <NumberField
        label={t("daily")}
        id="key-daily"
        min={0}
        value={daily}
        onValueChange={(value) => setDaily(value == null ? "" : String(value))}
        placeholder={t("unlimited")}
        {...(errors.daily ? { error: errors.daily } : {})}
      />
      <NumberField
        label={t("total")}
        id="key-total"
        min={0}
        value={total}
        onValueChange={(value) => setTotal(value == null ? "" : String(value))}
        placeholder={t("unlimited")}
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
        {creating ? t("creating") : t("create")}
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
  const t = useTranslations("console.keys");
  return (
    <>
      <TableRow className="hover:bg-neutral-2/40">
        <TableCell alignment="start" className="font-medium">
          {row.name}
          <span className="ml-2 font-normal text-xs text-muted-foreground">
            {t("row.created", { date: formatDate(row.createdAt) })}
          </span>
        </TableCell>
        <TableCell alignment="start" className="font-mono text-xs text-neutral-11">
          {row.keyPrefix}…
        </TableCell>
        <TableCell alignment="start">
          <Badge variant={STATUS_TONE[row.status]} size="sm">
            {t(`status.${row.status}`)}
          </Badge>
        </TableCell>
        <TableCell alignment="end" className="tabular-nums text-xs">
          {formatAmount(row.cost.daily)}
          {row.limits.daily === null ? "" : ` / ${formatAmount(row.limits.daily)}`}
          <span className="text-muted-foreground"> · </span>
          {formatAmount(row.cost.total)}
          {row.limits.total === null ? "" : ` / ${formatAmount(row.limits.total)}`}
        </TableCell>
        <TableCell alignment="end" className="tabular-nums text-xs">
          {row.rateLimitRps} r/s
        </TableCell>
        <TableCell alignment="start" className="text-xs text-muted-foreground">
          {row.expiresAt ? formatDateTime(row.expiresAt) : t("row.neverExpires")}
        </TableCell>
        <TableCell alignment="end">
          <div className="flex items-center justify-end gap-1">
            {busy ? <span className="mr-1 text-xs text-muted-foreground">{busy}…</span> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={busy !== null}
              aria-expanded={expanded}
              onClick={onToggleEdit}
            >
              {expanded ? t("row.collapse") : t("row.edit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              disabled={busy !== null}
              onClick={onToggleDisabled}
            >
              {row.status === "disabled" ? t("row.enable") : t("row.disable")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-destructive-strong"
              disabled={busy !== null}
              aria-label={t("row.revoke", { name: row.name })}
              onClick={onRevoke}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={7} alignment="start" className="bg-neutral-2/40 p-3">
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
  const t = useTranslations("console.keys.form");
  const tErrors = useTranslations("console.errors");
  const [name, setName] = useState(row.name);
  const [rate, setRate] = useState(String(row.rateLimitRps));
  const [daily, setDaily] = useState(row.limits.daily === null ? "" : String(row.limits.daily));
  const [total, setTotal] = useState(row.limits.total === null ? "" : String(row.limits.total));
  const [expires, setExpires] = useState(toDateInputValue(row.expiresAt));
  const [saveLogs, setSaveLogs] = useState(row.saveLogs);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = t("nameEmpty");
    const parsedRate = parseOptionalPositive(rate, { max: 1000, integer: true });
    if (!parsedRate.ok) nextErrors.rate = tErrors(parsedRate.error.key, parsedRate.error.values);
    const parsedDaily = parseOptionalPositive(daily, { max: 1_000_000 });
    if (!parsedDaily.ok)
      nextErrors.daily = tErrors(parsedDaily.error.key, parsedDaily.error.values);
    const parsedTotal = parseOptionalPositive(total, { max: 1_000_000 });
    if (!parsedTotal.ok)
      nextErrors.total = tErrors(parsedTotal.error.key, parsedTotal.error.values);
    const expiresAt = expires.trim() ? endOfUtcDayIso(expires) : null;
    if (expires.trim() && expiresAt === null) nextErrors.expires = t("expiresInvalid");
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
        label={t("name")}
        id={`edit-name-${row.id}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        {...(errors.name ? { error: errors.name } : {})}
      />
      <NumberField
        label={t("rate")}
        id={`edit-rate-${row.id}`}
        min={1}
        value={rate}
        onValueChange={(value) => setRate(value == null ? "" : String(value))}
        {...(errors.rate ? { error: errors.rate } : {})}
      />
      <NumberField
        label={t("daily")}
        id={`edit-daily-${row.id}`}
        min={0}
        value={daily}
        onValueChange={(value) => setDaily(value == null ? "" : String(value))}
        placeholder={t("unlimited")}
        {...(errors.daily ? { error: errors.daily } : {})}
      />
      <NumberField
        label={t("total")}
        id={`edit-total-${row.id}`}
        min={0}
        value={total}
        onValueChange={(value) => setTotal(value == null ? "" : String(value))}
        placeholder={t("unlimited")}
        {...(errors.total ? { error: errors.total } : {})}
      />
      <Input
        label={t("expires")}
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
          {t("saveLogs", { on: String(saveLogs) })}
        </Button>
        <span className="text-xs text-muted-foreground">{t("saveLogsHint")}</span>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="ink" size="sm" className="h-7" onClick={submit}>
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
