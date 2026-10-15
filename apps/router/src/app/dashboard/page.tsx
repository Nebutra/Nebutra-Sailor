import { ArrowRight, Check } from "@nebutra/icons";
import { monthToDateWindow } from "@nebutra/repositories";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CopyField } from "@/components/copy-field";
import { PageFrame } from "@/components/page-frame";
import { requireAuth } from "@/lib/auth";
import { usageRepository } from "@/lib/console-usage";
import { formatPrice, PROVIDER_LABEL } from "@/lib/listing-catalog";
import { getBaseUrlHint } from "@/lib/model-routes";
import { getApiKeyRepository, resolveSessionTenantId } from "@/lib/router-keys";
import { getPricedListingCatalog } from "@/lib/shelf-prices";
import { getBalanceForDisplay } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("console.dashboard");
  return { title: t("title") };
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-1 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? (
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** 管理后台 · 数据汇总（原首页控制台） */
export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");
  const t = await getTranslations("console.dashboard");
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
    { label: t("checklist.balance"), ok: balance.balance > 0, href: "/wallet" },
    {
      label: t("checklist.activeKey"),
      ok: keys.some((key) => key.status === "active"),
      href: "/keys",
    },
    {
      label: t("checklist.keyUsed"),
      ok: keys.some((key) => key.lastUsedAt !== null),
      href: "/docs",
    },
    { label: t("checklist.billed"), ok: usage.requestCount > 0, href: "/usage" },
  ];

  return (
    <PageFrame
      title={t("title")}
      description={t("description")}
      actions={
        <>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/usage">{t("actions.usage")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href="/">{t("actions.market")}</Link>
          </Button>
          <Button asChild variant="ink" size="sm" className="h-8">
            <Link href="/use" className="inline-flex items-center gap-1">
              {t("actions.quickUse")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label={t("stat.balance")}
          value={
            <>
              {balance.balance.toFixed(2)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                {balance.currency}
              </span>
            </>
          }
          hint={t("stat.balanceHint")}
        />
        <Stat
          label={t("stat.keys")}
          value={keys.length}
          hint={t("stat.keysHint", {
            count: keys.filter((key) => key.status === "active").length,
          })}
        />
        <Stat
          label={t("stat.monthSpend")}
          value={
            <>
              {usage.totalCost.toFixed(usage.totalCost > 0 && usage.totalCost < 0.01 ? 6 : 2)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                {usage.currency}
              </span>
            </>
          }
          hint={t("stat.requestsHint", { count: usage.requestCount })}
        />
        <Stat label={t("stat.catalog")} value={models.length} hint={fetchedNote} />
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-md)] border border-neutral-6 p-3">
          <p className="mb-2 text-xs font-semibold">{t("connect.title")}</p>
          <div className="space-y-2">
            <CopyField label="baseURL" value={baseUrl} />
            <CopyField label={t("connect.sampleModel")} value={sample} />
          </div>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] bg-neutral-2 p-2 font-mono text-xs leading-relaxed text-neutral-11">
            {`curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer sk-sailor-…" \\
  -d '{"model":"${sample}","messages":[{"role":"user","content":"ping"}]}'`}
          </pre>
        </div>
        <div className="rounded-[var(--radius-md)] border border-neutral-6 p-3">
          <p className="mb-2 text-xs font-semibold">{t("checklist.title")}</p>
          <ul className="space-y-1">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex h-8 items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 text-xs hover:bg-neutral-3"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={
                        c.ok
                          ? "inline-flex h-4 w-4 items-center justify-center rounded-full bg-success/18 text-success-strong"
                          : "inline-flex h-4 w-4 rounded-full bg-neutral-3"
                      }
                    >
                      {c.ok ? <Check className="h-2.5 w-2.5" /> : null}
                    </span>
                    {c.label}
                    {/* The tick is colour and shape only; without this the row
                        reads the same done and not-done to a screen reader. */}
                    <span className="sr-only">
                      {c.ok ? t("checklist.done") : t("checklist.todo")}
                    </span>
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">{t("featured.title")}</p>
        <Link href="/" className="text-xs text-neutral-11 hover:text-neutral-12">
          {t("featured.openMarket")}
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {models.slice(0, 6).map((m) => (
          <Link
            key={m.publicModel}
            href={`/use?model=${encodeURIComponent(m.publicModel)}`}
            className="rounded-[var(--radius-lg)] border border-neutral-6 p-3 hover:border-neutral-8 hover:bg-neutral-2/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-xs font-semibold">{m.publicModel}</p>
              <span className="text-xs text-muted-foreground">{PROVIDER_LABEL[m.provider]}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.name}</p>
            <p className="mt-2 font-mono text-xs tabular-nums text-neutral-11">
              {t("featured.price", {
                input: formatPrice(m.inputPerMTok),
                output: formatPrice(m.outputPerMTok),
              })}
            </p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
