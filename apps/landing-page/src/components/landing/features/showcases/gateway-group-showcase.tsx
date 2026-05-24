"use client";

import { Api, Check, Code, Connection, Lightning, Shield } from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Kbd,
  MetricCard,
  StatusBadge,
  Table,
} from "@nebutra/ui/primitives";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

// Deterministic per-slug variation. Same slug → same numbers; distinct slugs
// get visibly different metrics + rows.
function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

const METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;

const COPY = {
  en: {
    typed: "Type-safe",
    status: "200 OK",
    totalLatency: "Total latency",
    p50: "p50",
    p95: "p95",
    rps: "RPS",
    endpointsHeading: "Endpoints",
    routeCol: "Route",
    statusCol: "Status",
    latencyCol: "Latency",
    openapiBadge: "OpenAPI 3.1",
    schemaHeading: "Response shape",
    footerSuffix: "OpenAPI + typed routes",
  },
  zh: {
    typed: "类型安全",
    status: "200 OK",
    totalLatency: "总延迟",
    p50: "p50",
    p95: "p95",
    rps: "RPS",
    endpointsHeading: "端点",
    routeCol: "路由",
    statusCol: "状态",
    latencyCol: "延迟",
    openapiBadge: "OpenAPI 3.1",
    schemaHeading: "响应结构",
    footerSuffix: "OpenAPI + 类型路由",
  },
} as const;

function formatMs(ms: number): string {
  return `${ms} ms`;
}

export function GatewayGroupShowcase({ entry, locale }: PackageShowcaseProps) {
  const t = COPY[locale];
  const slug = entry.slug;
  const base = `/v1/${slug}`;

  // Deterministic metrics seeded from slug.
  const total = 22 + seeded(slug, 38);
  const p50 = 14 + seeded(slug, 16, 5);
  const p95 = 42 + seeded(slug, 60, 11);
  const rps = (1.2 + seeded(slug, 30, 17) / 10).toFixed(1);

  const routes: ReadonlyArray<{
    id: string;
    path: string;
    methodIdx: number;
    statusCode: 200 | 201 | 204;
    latency: number;
  }> = [
    { id: "list", path: base, methodIdx: 0, statusCode: 200, latency: p50 },
    { id: "show", path: `${base}/:id`, methodIdx: 0, statusCode: 200, latency: p50 + 4 },
    { id: "create", path: base, methodIdx: 1, statusCode: 201, latency: p50 + 9 },
    {
      id: "health",
      path: "/v1/health",
      methodIdx: 0,
      statusCode: 200,
      latency: 3 + seeded(slug, 5, 23),
    },
  ];

  return (
    <ShowcaseFrame className="flex flex-col gap-5">
      {/* Header: request envelope */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0 pb-4">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
            <Api className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <Badge size="sm" variant="outline" className="font-mono">
              {entry.path}
            </Badge>
          </div>
          <Badge size="sm" variant="blue-subtle">
            <Shield aria-hidden="true" />
            {t.typed}
          </Badge>
          <StatusBadge
            status="success"
            leftIcon={Check}
            leftLabel={t.status}
            rightLabel={`GET ${base}`}
          />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <code className="block truncate font-mono text-xs text-foreground">
              <span className="text-muted-foreground">GET </span>
              {base}
            </code>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              size="sm"
              label={t.totalLatency}
              value={formatMs(total)}
              icon={<Lightning />}
            />
            <MetricCard size="sm" label={t.p50} value={formatMs(p50)} />
            <MetricCard size="sm" label={t.p95} value={formatMs(p95)} trend="neutral" />
            <MetricCard
              size="sm"
              label={t.rps}
              value={`${rps}k`}
              icon={<Connection />}
              trend="up"
            />
          </div>
        </CardContent>
      </Card>

      {/* Endpoints table + schema preview */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.4fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.endpointsHeading}
            </p>
            <Badge size="sm" variant="gray-subtle">
              <Code aria-hidden="true" />
              {t.openapiBadge}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <Table wrapperClassName="border-0 bg-transparent p-0">
              <Table.Header>
                <Table.Row>
                  <Table.Head>{t.routeCol}</Table.Head>
                  <Table.Head>{t.statusCol}</Table.Head>
                  <Table.Head numeric>{t.latencyCol}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {routes.map((route) => (
                  <Table.Row key={route.id}>
                    <Table.Cell>
                      <span className="flex items-center gap-2">
                        <Kbd small>{METHODS[route.methodIdx] ?? "GET"}</Kbd>
                        <code className="font-mono text-xs text-foreground">{route.path}</code>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge size="sm" variant="green-subtle" className="font-mono">
                        {route.statusCode}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell numeric>{formatMs(route.latency)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.schemaHeading}
            </p>
            <Badge size="sm" variant="blue-subtle">
              <Code aria-hidden="true" />
              JSON
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="overflow-hidden rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-foreground">
              {`{
  "id": string,
  "slug": "${slug}",
  "data": ${slug}[],
  "meta": { total: number }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="truncate">{entry.path}</span>
        <span className="shrink-0">{t.footerSuffix}</span>
      </div>
    </ShowcaseFrame>
  );
}
