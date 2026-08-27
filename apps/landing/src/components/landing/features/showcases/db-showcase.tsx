"use client";

import { Check, Database, Eye, EyeOff, LockClosed, Shield } from "@nebutra/icons";
import {
  Badge,
  CodeBlock,
  MetricCard,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

// =============================================================================
// Copy
// =============================================================================

const COPY = {
  en: {
    headerLabel: "Query · packages/platform/db",
    rlsLeft: "RLS",
    rlsRight: "enforced",
    resultsTitle: "Query results",
    resultsSubtitle: "tenant-scoped via row-level security",
    visibleLabel: "Visible rows",
    hiddenLabel: "Hidden by RLS",
    visibleHint: "in tenant_a",
    hiddenHint: "other tenants",
    colId: "id",
    colTitle: "title",
    colTenant: "tenant_id",
    colPublished: "published_at",
    hiddenNote: "RLS hides rows belonging to other tenants — they never leave the database.",
  },
  zh: {
    headerLabel: "查询 · packages/platform/db",
    rlsLeft: "RLS",
    rlsRight: "已启用",
    resultsTitle: "查询结果",
    resultsSubtitle: "通过行级安全按租户隔离",
    visibleLabel: "可见行",
    hiddenLabel: "RLS 隐藏",
    visibleHint: "tenant_a 内",
    hiddenHint: "其他租户",
    colId: "id",
    colTitle: "title",
    colTenant: "tenant_id",
    colPublished: "published_at",
    hiddenNote: "RLS 在数据库层屏蔽其他租户的行，应用永远看不到它们。",
  },
} as const;

// =============================================================================
// Demo data
// =============================================================================

type Row = {
  id: string;
  title: string;
  tenantId: "tenant_a" | "tenant_b" | "tenant_c";
  publishedAt: string;
  hidden: boolean;
};

const ROWS: ReadonlyArray<Row> = [
  {
    id: "pst_01HF…a3k",
    title: "Launching multi-tenant RLS",
    tenantId: "tenant_a",
    publishedAt: "2026-05-21",
    hidden: false,
  },
  {
    id: "pst_01HF…b7m",
    title: "Migrating off shared schemas",
    tenantId: "tenant_a",
    publishedAt: "2026-05-18",
    hidden: false,
  },
  {
    id: "pst_01HF…c2q",
    title: "Internal roadmap (draft)",
    tenantId: "tenant_b",
    publishedAt: "2026-05-17",
    hidden: true,
  },
  {
    id: "pst_01HF…d9s",
    title: "Customer-only changelog",
    tenantId: "tenant_c",
    publishedAt: "2026-05-15",
    hidden: true,
  },
  {
    id: "pst_01HF…e4w",
    title: "RFC: schema-per-tenant",
    tenantId: "tenant_b",
    publishedAt: "2026-05-12",
    hidden: true,
  },
];

const QUERY_CODE = `// Tenant context resolved by @nebutra/tenant middleware
const ctx = getCurrentTenant();

const posts = await prisma.post.findMany({
  where: {
    tenantId: ctx.tenant.id,
    published: true,
  },
  orderBy: { publishedAt: "desc" },
  take: 5,
});
// → Prisma client wrapped with withRls(prisma, ctx.tenant.id)
// → PostgreSQL enforces RLS via SET LOCAL app.tenant_id
`;

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(value: number, locale: "en" | "zh") {
  return value.toLocaleString(isZhUiLocale(locale) ? "zh-CN" : "en-US");
}

function tenantBadgeVariant(tenantId: Row["tenantId"]): "blue-subtle" | "gray-subtle" {
  return tenantId === "tenant_a" ? "blue-subtle" : "gray-subtle";
}

// =============================================================================
// Component
// =============================================================================

export function DbShowcase(_props: PackageShowcaseProps) {
  const locale = _props.locale;
  const t = COPY[locale];

  const visibleCount = 847;
  const hiddenCount = 12401;

  return (
    <ShowcaseFrame className="p-0! md:p-0!">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <Database className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-[13px] text-muted-foreground">{t.headerLabel}</span>
        </div>
        <StatusBadge
          status="success"
          leftIcon={Shield}
          leftLabel={t.rlsLeft}
          rightIcon={Check}
          rightLabel={t.rlsRight}
        />
      </div>

      {/* Body */}
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Query */}
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <CodeBlock
            filename="apps/web/app/posts/page.tsx"
            language="typescript"
            hideLineNumbers
            maxHeight="240px"
            aria-label="Tenant-scoped Prisma query"
          >
            {QUERY_CODE}
          </CodeBlock>
        </div>

        {/* Results */}
        <div className="flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{t.resultsTitle}</p>
              <p className="text-xs text-muted-foreground">{t.resultsSubtitle}</p>
            </div>
            <Badge variant="gray-subtle" size="sm" icon={<LockClosed className="size-3" />}>
              {ROWS.filter((r) => !r.hidden).length} / {ROWS.length}
            </Badge>
          </div>

          <Table className="text-[12px]" wrapperClassName="border-0 bg-transparent p-0">
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[11px]">{t.colId}</TableHead>
                <TableHead className="font-mono text-[11px]">{t.colTitle}</TableHead>
                <TableHead className="font-mono text-[11px]">{t.colTenant}</TableHead>
                <TableHead className="font-mono text-[11px]">{t.colPublished}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.hidden &&
                      "opacity-40 [&_td]:line-through [&_td]:decoration-muted-foreground/40",
                  )}
                  aria-label={row.hidden ? "row hidden by RLS" : "visible row"}
                >
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {row.id}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-foreground">
                    {row.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenantBadgeVariant(row.tenantId)} size="sm">
                      {row.tenantId}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {row.publishedAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <EyeOff className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span>{t.hiddenNote}</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 gap-4 border-t border-border bg-muted/20 px-5 py-3">
        <MetricCard
          size="sm"
          label={t.visibleLabel}
          value={formatNumber(visibleCount, locale)}
          description={t.visibleHint}
          icon={<Eye />}
        />
        <MetricCard
          size="sm"
          label={t.hiddenLabel}
          value={formatNumber(hiddenCount, locale)}
          description={t.hiddenHint}
          icon={<EyeOff />}
        />
      </div>
    </ShowcaseFrame>
  );
}
