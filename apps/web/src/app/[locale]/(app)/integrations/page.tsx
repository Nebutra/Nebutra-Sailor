"use client";

import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, PageHeader } from "@nebutra/ui/layout";
import {
  Activity,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Settings,
  ShoppingBag,
  Store,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

const CATALOG = [
  {
    type: "SHOPIFY" as const,
    name: "Shopify",
    description: "Sync products, orders, and customers from your Shopify store.",
    icon: ShoppingBag,
    color: "text-green-10",
    bgColor: "bg-green-3 dark:bg-green-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/shopify",
  },
  {
    type: "SHOPLINE" as const,
    name: "Shopline",
    description: "Connect your Shopline storefront for unified commerce analytics.",
    icon: Store,
    color: "text-blue-10",
    bgColor: "bg-blue-3 dark:bg-blue-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/shopline",
  },
  {
    type: "STRIPE" as const,
    name: "Stripe",
    description: "Synchronize payment data, invoices, and subscription events.",
    icon: Zap,
    color: "text-purple-10",
    bgColor: "bg-purple-3 dark:bg-purple-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/stripe",
  },
  {
    type: "CUSTOM" as const,
    name: "Custom Webhook",
    description: "Send and receive events via custom HTTP webhooks.",
    icon: Activity,
    color: "text-amber-10",
    bgColor: "bg-amber-3 dark:bg-amber-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/webhooks",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
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
    <section className="mx-auto w-full max-w-7xl" aria-label="Integrations">
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Integrations"
          description="Connect your favorite tools and services to supercharge your workflow."
        />
      </AnimateIn>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <>
          <AnimateIn preset="fadeUp">
            <h2 className="mt-8 text-lg font-semibold text-neutral-12 dark:text-white">
              Connected
            </h2>
          </AnimateIn>

          <AnimateInGroup stagger="fast" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const catalog = CATALOG.find((c) => c.type === integration.type);
              const Icon = catalog?.icon ?? Activity;

              return (
                <AnimateIn key={integration.id} preset="fadeUp">
                  <Card className="relative p-4 sm:p-5">
                    {/* Status dot */}
                    <div className="absolute right-4 top-4">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          integration.isActive ? "bg-green-9" : "bg-neutral-8"
                        }`}
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${catalog?.bgColor ?? "bg-neutral-3"}`}
                      >
                        <Icon className={`h-5 w-5 ${catalog?.color ?? "text-neutral-11"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">
                          {integration.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/50">
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
                        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          integration.isActive
                            ? "bg-amber-3 text-amber-11 hover:bg-amber-4"
                            : "bg-green-3 text-green-11 hover:bg-green-4"
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
                        className="flex items-center gap-1 rounded-md bg-red-3 px-2.5 py-1.5 text-xs font-medium text-red-11 transition-colors hover:bg-red-4"
                      >
                        <X className="h-3 w-3" /> Disconnect
                      </button>
                    </div>
                  </Card>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </>
      )}

      {/* Available Integrations */}
      <AnimateIn preset="fadeUp">
        <h2 className="mt-10 text-lg font-semibold text-neutral-12 dark:text-white">
          {integrations.length > 0 ? "Available" : "Connect an Integration"}
        </h2>
        {integrations.length === 0 && !loading && (
          <p className="mt-1 text-sm text-neutral-11 dark:text-white/70">
            Get started by connecting one of the services below.
          </p>
        )}
      </AnimateIn>

      {loading ? (
        <AnimateIn preset="fade">
          <div className="mt-8 flex items-center justify-center gap-2 py-12 text-neutral-10">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading integrations...</span>
          </div>
        </AnimateIn>
      ) : (
        <AnimateInGroup stagger="fast" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATALOG.map((item) => {
            const isConnected = connectedTypes.has(item.type);
            const isConnecting_ = connecting === item.type;
            const Icon = item.icon;

            return (
              <AnimateIn key={item.type} preset="fadeUp">
                <Card
                  className={`group flex flex-col p-4 transition-all sm:p-5 ${
                    isConnected
                      ? "border-green-7 opacity-60"
                      : "hover:border-[var(--brand-7)] hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bgColor}`}
                    >
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-xs leading-relaxed text-neutral-10 dark:text-white/50">
                    {item.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-11">
                        <Check className="h-3.5 w-3.5" /> Connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isConnecting_}
                        onClick={() => handleConnect(item.type, item.name)}
                        className="flex items-center gap-1 rounded-md bg-[var(--brand-9)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--brand-10)] disabled:opacity-50"
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
                      className="flex items-center gap-1 text-xs text-neutral-10 transition-colors hover:text-neutral-12 dark:text-white/50 dark:hover:text-white"
                    >
                      <ExternalLink className="h-3 w-3" /> Docs
                    </a>
                  </div>
                </Card>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      )}

      {/* Empty state fallback */}
      {!loading && integrations.length === 0 && CATALOG.length === 0 && (
        <AnimateIn preset="fadeUp">
          <Card className="mt-8 p-8">
            <EmptyState
              title="No integrations available"
              description="Integration connectors will be added in future updates."
            />
          </Card>
        </AnimateIn>
      )}
    </section>
  );
}
