import { ArrowRight, Check } from "@nebutra/icons";
import { monthToDateWindow } from "@nebutra/repositories";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyField } from "@/components/copy-field";
import { PageFrame } from "@/components/page-frame";
import { requireAuth } from "@/lib/auth";
import { usageRepository } from "@/lib/console-usage";
import { formatPrice, getPricedListingCatalog, PROVIDER_LABEL } from "@/lib/listing-catalog";
import { getBaseUrlHint } from "@/lib/model-routes";
import { getApiKeyRepository, resolveSessionTenantId } from "@/lib/router-keys";
import { getBalanceForDisplay } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const metadata = { title: "数据汇总" };

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--neutral-10)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--neutral-10)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** 管理后台 · 数据汇总（原首页控制台） */
export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");
  const tenantId = await resolveSessionTenantId(session);
  const period = monthToDateWindow();
  // Month-to-date in UTC — the same window `/usage` opens on and the same
  // clock the per-key daily cap resets on, so the two pages cannot disagree.
  const [balance, keys, usage] = tenantId
    ? await Promise.all([
        getBalanceForDisplay(tenantId),
        getApiKeyRepository().listDetailByTenant(tenantId),
        usageRepository().summary({ tenantId, from: period.from, to: period.to }),
      ])
    : [
        { balance: 0, currency: "USD" },
        [],
        {
          totalCost: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          requestCount: 0,
          currency: "USD",
        },
      ];
  const baseUrl = getBaseUrlHint();
  const { models, fetchedNote } = await getPricedListingCatalog();
  const sample =
    models.find((m) => m.routed)?.publicModel ?? models[0]?.publicModel ?? DEFAULT_PUBLIC_MODEL;

  // Every line is computed. Two of these used to be literals — `配置 baseURL`
  // was hard-coded `true` and `快捷使用试跑` hard-coded `false`, so the list
  // told the same story to an account that had never made a call and to one
  // that had made a thousand.
  const checklist = [
    { label: "钱包余额 > 0", ok: balance.balance > 0, href: "/wallet" },
    { label: "至少一个可用 Key", ok: keys.some((key) => key.status === "active"), href: "/keys" },
    {
      label: "Key 被调用过（baseURL 已接通）",
      ok: keys.some((key) => key.lastUsedAt !== null),
      href: "/docs",
    },
    { label: "本月已有计费请求", ok: usage.requestCount > 0, href: "/usage" },
  ];

  return (
    <PageFrame
      title="数据汇总"
      description="管理后台：充值 · Key · 接入。逛货架请回 API 集市首页。"
      actions={
        <>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/usage">用量</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/">API 集市</Link>
          </Button>
          <Button asChild variant="ink" size="sm" className="h-8">
            <Link href="/use" className="inline-flex items-center gap-1">
              快捷使用
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="余额"
          value={
            <>
              {balance.balance.toFixed(2)}
              <span className="ml-1 text-xs font-medium text-[var(--neutral-10)]">
                {balance.currency}
              </span>
            </>
          }
          hint="prepaid wallet"
        />
        <Stat
          label="API Keys"
          value={keys.length}
          hint={`${keys.filter((key) => key.status === "active").length} 把在用`}
        />
        <Stat
          label="本月花费"
          value={
            <>
              {usage.totalCost.toFixed(usage.totalCost > 0 && usage.totalCost < 0.01 ? 6 : 2)}
              <span className="ml-1 text-xs font-medium text-[var(--neutral-10)]">
                {usage.currency}
              </span>
            </>
          }
          hint={`${usage.requestCount} 次请求`}
        />
        <Stat label="目录模型" value={models.length} hint={fetchedNote} />
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
          <p className="mb-2 text-[12px] font-semibold">接入参数</p>
          <div className="space-y-2">
            <CopyField label="baseURL" value={baseUrl} />
            <CopyField label="示例 model" value={sample} />
          </div>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--neutral-2)] p-2 font-mono text-[10px] leading-relaxed text-[var(--neutral-11)]">
            {`curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer sk-sailor-…" \\
  -d '{"model":"${sample}","messages":[{"role":"user","content":"ping"}]}'`}
          </pre>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
          <p className="mb-2 text-[12px] font-semibold">上线检查</p>
          <ul className="space-y-1">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex h-8 items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 text-[12px] hover:bg-[var(--neutral-3)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={
                        c.ok
                          ? "inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-success)_18%,transparent)] text-[var(--status-success)]"
                          : "inline-flex h-4 w-4 rounded-full bg-[var(--neutral-3)]"
                      }
                    >
                      {c.ok ? <Check className="h-2.5 w-2.5" /> : null}
                    </span>
                    {c.label}
                    {/* The tick is colour and shape only; without this the row
                        reads the same done and not-done to a screen reader. */}
                    <span className="sr-only">{c.ok ? "已完成" : "未完成"}</span>
                  </span>
                  <ArrowRight className="h-3 w-3 text-[var(--neutral-9)]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-semibold">目录精选</p>
        <Link
          href="/"
          className="text-[11px] text-[var(--neutral-11)] hover:text-[var(--neutral-12)]"
        >
          打开 API 集市 →
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {models.slice(0, 6).map((m) => (
          <Link
            key={m.publicModel}
            href={`/use?model=${encodeURIComponent(m.publicModel)}`}
            className="rounded-[var(--radius-lg)] border border-[var(--neutral-6)] p-3 hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[12px] font-semibold">{m.publicModel}</p>
              <span className="text-[10px] text-[var(--neutral-10)]">
                {PROVIDER_LABEL[m.provider]}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] text-[var(--neutral-10)]">{m.name}</p>
            <p className="mt-2 font-mono text-[10px] tabular-nums text-[var(--neutral-11)]">
              入 {formatPrice(m.inputPerMTok)} · 出 {formatPrice(m.outputPerMTok)} /1M
            </p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
