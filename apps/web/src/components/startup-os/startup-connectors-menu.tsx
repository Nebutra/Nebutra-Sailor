"use client";

import { CheckCircle, Connection, Plus } from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";

/**
 * Connectors menu for the Startup OS prompt — REAL data, no mocks.
 *
 * Renders exclusively the real connector catalog (`INTEGRATION_CATALOG`, backed
 * by the `IntegrationType` enum + gateway), reads live connected-state from the
 * real `GET /api/v1/integrations`, and routes every "Connect"/"Manage" action to
 * the real `/integrations` flow (where credentials are stored vault-encrypted).
 * No fabricated providers — to add one, extend the catalog + gateway.
 */
export function StartupConnectorsMenu({ disabled }: { disabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const integrationsHref = `/${locale}/integrations`;
  const [connectedTypes, setConnectedTypes] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(resolveApiUrl("/api/v1/integrations"), {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          integrations?: Array<{ type?: string; isActive?: boolean }>;
        };
        if (cancelled) return;
        const types = (data.integrations ?? [])
          .filter((entry) => entry.isActive !== false)
          .map((entry) => entry.type)
          .filter((type): type is string => Boolean(type));
        setConnectedTypes(new Set(types));
      } catch {
        // Live state is best-effort; the catalog still renders honestly.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label="Connectors"
        title="Connectors"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-7 bg-neutral-1 text-neutral-11 shadow-none transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Connection className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-80 p-1.5">
        <DropdownMenuLabel className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-9">
          Connect a data source
        </DropdownMenuLabel>
        {INTEGRATION_CATALOG.map((entry) => {
          const Icon = entry.icon;
          const connected = connectedTypes.has(entry.type);
          return (
            <DropdownMenuItem
              key={entry.type}
              onSelect={() => router.push(integrationsHref)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${entry.bgColor}`}
              >
                <Icon className={`size-4 ${entry.color}`} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-12">
                {entry.name}
              </span>
              {connected ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-10">
                  <CheckCircle className="size-3.5" aria-hidden="true" />
                  Connected
                </span>
              ) : (
                <span className="shrink-0 text-xs font-medium text-primary">Connect</span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onSelect={() => router.push(integrationsHref)}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-neutral-11"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-7 text-neutral-10">
            <Plus className="size-4" aria-hidden="true" />
          </span>
          Manage connectors
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
