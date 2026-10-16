"use client";

import {
  ChartActivity as Activity,
  Check,
  External as ExternalLink,
  LoaderCircle as Loader2,
  Plus,
  SettingsGear as Settings,
  Cross as X,
} from "@nebutra/icons";
import { EmptyState, PageHeader } from "@nebutra/ui/layout";
import { DashboardPanel } from "@nebutra/ui/patterns";
import { Button, Card } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { DocumentTaskUploader } from "@/components/documents/document-task-uploader";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import {
  INTEGRATIONS_ENDPOINT,
  type IntegrationRecord,
  integrationsQueryOptions,
} from "@/lib/queries/integrations";
import { queryKeys } from "@/lib/query-keys";

// ── Integration Catalog ──────────────────────────────────────────────────────

// Single source of truth — see @/lib/integrations/catalog (shared with the
// Startup OS connectors menu so the two surfaces can never drift apart).
const CATALOG = INTEGRATION_CATALOG;

// ── Document Pipeline ─────────────────────────────────────────────────────────

// Rehomed from the converged dashboard Home (now a redirect to /startup-os).
// The document task pipeline is a connector-adjacent surface: it feeds source
// files into the origin task queue, so it lives alongside the integration
// catalog. Labels reuse the existing dashboard.documentPipeline.* i18n keys.
function DocumentPipelineSection() {
  const t = useTranslations("dashboard.documentPipeline");

  return (
    <DashboardPanel title={t("title")} description={t("description")}>
      <DocumentTaskUploader
        labels={{
          intakeTitle: t("intakeTitle"),
          intakeDescription: t("intakeDescription"),
          chooseDocument: t("chooseDocument"),
          startParseTask: t("startParseTask"),
          queued: t("queued"),
          fileInputLabel: t("fileInputLabel"),
          fallbackError: t("fallbackError"),
          taskStatus: t("taskStatus"),
          progressLabel: t("progressLabel"),
          refreshStatus: t("refreshStatus"),
          cancelTask: t("cancelTask"),
          statusError: t("statusError"),
          cancelError: t("cancelError"),
          statusQueued: t("statusQueued"),
          statusRunning: t("statusRunning"),
          statusSucceeded: t("statusSucceeded"),
          statusFailed: t("statusFailed"),
          statusCancelled: t("statusCancelled"),
          resultReady: t("resultReady"),
          taskError: t("taskError"),
          updatedAt: t("updatedAt"),
        }}
      />
    </DashboardPanel>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const tCopy = useTranslations("copy.integrationsPage");
  const tc = useTranslations("copy.integrationsPage");
  const tSos = useTranslations("startupOs");
  const tNav = useTranslations("Sidebar.nav");
  const queryClient = useQueryClient();
  const integrationsQuery = useQuery(integrationsQueryOptions());
  const integrations: IntegrationRecord[] = integrationsQuery.data ?? [];
  // An error reads as empty: the catalog below still offers every connector.
  const loading = integrationsQuery.isPending;

  const refreshIntegrations = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });

  const connect = useMutation({
    mutationFn: async ({ type, name }: { type: string; name: string }) => {
      const res = await fetch(resolveApiUrl(INTEGRATIONS_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, name }),
      });
      if (!res.ok) throw new Error(`Failed to connect (${res.status})`);
    },
    onSuccess: refreshIntegrations,
  });
  const connecting = connect.isPending ? (connect.variables?.type ?? null) : null;

  const update = useMutation({
    mutationFn: (request: { id: string; method: "PATCH" | "DELETE"; body?: unknown }) =>
      fetch(resolveApiUrl(`${INTEGRATIONS_ENDPOINT}/${request.id}`), {
        method: request.method,
        credentials: "include",
        ...(request.body === undefined
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(request.body),
            }),
      }),
    onSettled: refreshIntegrations,
  });

  const handleConnect = (type: string, name: string) => connect.mutate({ type, name });
  const handleToggle = (id: string, isActive: boolean) =>
    update.mutate({ id, method: "PATCH", body: { isActive: !isActive } });
  const handleDisconnect = (id: string) => update.mutate({ id, method: "DELETE" });

  const connectedTypes = new Set(integrations.map((i) => i.type));

  return (
    <section className="mx-auto w-full max-w-wide" aria-label={tc("integrations")}>
      {/* Named as the sidebar names it, so the destination and its title agree. */}
      <PageHeader title={tNav("connectors")} description={tc("connectYourFavoriteTools")} />

      {/* Document pipeline — rehomed from the converged dashboard Home */}

      <div className="mt-8">
        <DocumentPipelineSection />
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <>
          <h2 className="mt-8 text-lg text-neutral-12">{tc("connected")}</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const catalog = CATALOG.find((c) => c.type === integration.type);
              const Icon = catalog?.icon ?? Activity;

              return (
                <Card key={integration.id} className="relative p-4 sm:p-5">
                  {/* Status dot */}
                  <div className="absolute right-4 top-4">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        integration.isActive ? "bg-success" : "bg-neutral-8"
                      }`}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-neutral-2 shadow-xs">
                      <Icon className={`size-5 ${catalog?.color ?? "text-neutral-11"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm text-neutral-12">{integration.name}</h3>
                      <p className="mt-0.5 text-xs text-neutral-10">
                        {integration.isActive ? tCopy("active") : tCopy("paused")}
                        {integration.lastSyncAt &&
                          ` · ${tc("lastSync", { date: new Date(integration.lastSyncAt) })}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(integration.id, integration.isActive)}
                    >
                      {integration.isActive ? (
                        <>
                          <Settings className="h-3 w-3" /> {tc("pause")}
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" /> {tc("resume")}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDisconnect(integration.id)}
                      className="text-destructive-strong"
                    >
                      <X className="h-3 w-3" /> {tc("disconnect")}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Available Integrations */}

      <h2 className="mt-10 text-lg text-neutral-12">
        {integrations.length > 0 ? tCopy("available") : tCopy("connectAnIntegration")}
      </h2>
      {integrations.length === 0 && !loading && (
        <p className="mt-1 text-sm text-neutral-11">{tc("getStartedByConnecting")}</p>
      )}

      {loading ? (
        <div
          role="status"
          aria-label={tc("loadingIntegrations")}
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CATALOG.map((item) => (
            <div
              key={item.type}
              className="h-40 animate-pulse rounded-xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATALOG.map((item) => {
            const isConnected = connectedTypes.has(item.type);
            const isConnecting_ = connecting === item.type;
            const Icon = item.icon;

            return (
              <Card
                padding="sm"
                key={item.type}
                className="group flex flex-col p-4 shadow-xs sm:p-5"
              >
                <div className="flex items-center gap-3">
                  {/* One neutral logo plate per service; the mark keeps its colour. */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-neutral-2 shadow-xs">
                    <Icon className={`size-5 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm text-neutral-12">
                      {item.type === "CUSTOM" ? tCopy("customWebhook") : item.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${isConnected ? "bg-success" : "bg-neutral-7"}`}
                      />
                      {isConnected ? tc("connected") : tc("notConnected")}
                    </p>
                  </div>
                </div>

                <p className="mt-3 flex-1 text-xs leading-relaxed text-neutral-10">
                  {tCopy(`catalog.${item.type}`)}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success-strong">
                      <Check className="h-3.5 w-3.5" /> {tc("connected")}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isConnecting_}
                      onClick={() => handleConnect(item.type, item.name)}
                    >
                      {isConnecting_ ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {tc("connect")}
                    </Button>
                  )}
                  <a
                    href={item.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-neutral-10 transition-colors hover:text-neutral-12"
                  >
                    <ExternalLink className="h-3 w-3" /> {tc("docs")}
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state fallback */}
      {!loading && integrations.length === 0 && CATALOG.length === 0 && (
        <Card className="mt-8 p-8">
          <EmptyState
            title={tSos("emptyState.integrations")}
            description={tc("integrationConnectorsWillBe")}
          />
        </Card>
      )}
    </section>
  );
}
