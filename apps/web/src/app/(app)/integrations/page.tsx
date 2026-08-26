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
import { Card, EmptyState, PageHeader } from "@nebutra/ui/layout";
import { DashboardPanel } from "@nebutra/ui/patterns";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { DocumentTaskUploader } from "@/components/documents/document-task-uploader";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";

// ── Types ────────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  type: "SHOPIFY" | "SHOPLINE" | "STRIPE" | "CUSTOM";
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

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
  const tSos = useTranslations("startupOs");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/integrations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations ?? []);
      }
    } catch {
      // Silently fail — empty state will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async (type: string, name: string) => {
    setConnecting(type);
    try {
      const res = await fetch("/api/v1/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, name }),
      });
      if (res.ok) {
        await fetchIntegrations();
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/v1/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !isActive }),
      });
      await fetchIntegrations();
    } catch {
      // Silently fail
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/v1/integrations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchIntegrations();
    } catch {
      // Silently fail
    }
  };

  const connectedTypes = new Set(integrations.map((i) => i.type));

  return (
    <section className="mx-auto w-full max-w-[1400px]" aria-label="Integrations">
      <PageHeader
        title="Integrations"
        description="Connect your favorite tools and services to supercharge your workflow."
      />

      {/* Document pipeline — rehomed from the converged dashboard Home */}

      <div className="mt-8">
        <DocumentPipelineSection />
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-neutral-12">Connected</h2>

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
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${catalog?.bgColor ?? "bg-neutral-3"}`}
                    >
                      <Icon className={`h-5 w-5 ${catalog?.color ?? "text-neutral-11"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-neutral-12">{integration.name}</h3>
                      <p className="mt-0.5 text-xs text-neutral-10">
                        {integration.isActive ? "Active" : "Paused"}
                        {integration.lastSyncAt &&
                          ` · Last sync ${new Date(integration.lastSyncAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(integration.id, integration.isActive)}
                      className={`flex items-center gap-1 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        integration.isActive
                          ? "bg-warning/10 text-[hsl(var(--warning-strong))] hover:bg-warning/10/70"
                          : "bg-success/10 text-[hsl(var(--success-strong))] hover:bg-success/10/70"
                      }`}
                    >
                      {integration.isActive ? (
                        <>
                          <Settings className="h-3 w-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" /> Resume
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(integration.id)}
                      className="flex items-center gap-1 rounded-[var(--radius-md)] bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--destructive-strong))] transition-colors hover:bg-destructive/10/70"
                    >
                      <X className="h-3 w-3" /> Disconnect
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Available Integrations */}

      <h2 className="mt-10 text-lg font-semibold text-neutral-12">
        {integrations.length > 0 ? "Available" : "Connect an Integration"}
      </h2>
      {integrations.length === 0 && !loading && (
        <p className="mt-1 text-sm text-neutral-11">
          Get started by connecting one of the services below.
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-12 text-neutral-10">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading integrations...</span>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATALOG.map((item) => {
            const isConnected = connectedTypes.has(item.type);
            const isConnecting_ = connecting === item.type;
            const Icon = item.icon;

            return (
              <Card
                key={item.type}
                className={`group flex flex-col p-4 transition-[border-color,box-shadow,opacity] duration-150 sm:p-5 ${
                  isConnected
                    ? "border-success/40 opacity-60"
                    : "hover:border-[var(--blue-7)] hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] ${item.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-12">{item.name}</h3>
                  </div>
                </div>

                <p className="mt-3 flex-1 text-xs leading-relaxed text-neutral-10">
                  {item.description}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <Check className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isConnecting_}
                      onClick={() => handleConnect(item.type, item.name)}
                      className="flex items-center gap-1 rounded-[var(--radius-md)] bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isConnecting_ ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Connect
                    </button>
                  )}
                  <a
                    href={item.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-neutral-10 transition-colors hover:text-neutral-12"
                  >
                    <ExternalLink className="h-3 w-3" /> Docs
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
            description="Integration connectors will be added in future updates."
          />
        </Card>
      )}
    </section>
  );
}
