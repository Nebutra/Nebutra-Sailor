import "server-only";

import type {
  AdminAction,
  AdminManifest,
  AdminSeverity,
  AdminSignal,
  SignalReading,
} from "@nebutra/contracts/admin";
import {
  type ContractCaller,
  loadManifests,
  type ProductManifest,
  probeSignal,
} from "./contract-client";

/**
 * Inbox = the union of raised signals across every product, ranked. An item
 * exists only while its signal is raised; nobody closes it by hand. That is
 * the rule that keeps the first page honest.
 */
export interface InboxItem {
  key: string;
  product: string;
  productLabel: string;
  domain: string;
  signal: AdminSignal;
  reading: SignalReading;
  /** Resolving action from the manifest, with its url resolved lazily by the UI. */
  action: AdminAction | null;
  manifest: AdminManifest;
}

export interface InboxResult {
  items: InboxItem[];
  /** Signals whose probe itself failed — shown as grey "unknown", never hidden. */
  unknown: InboxItem[];
  /** Products whose manifest could not be loaded. */
  failures: Array<{ serviceId: string; error: string }>;
  probedAt: string;
}

const SEVERITY_RANK: Record<AdminSeverity, number> = { critical: 0, warn: 1, info: 2 };

export async function buildInbox(
  caller: ContractCaller,
  fetchImpl: typeof fetch = fetch,
): Promise<InboxResult> {
  const { products, failures } = await loadManifests(fetchImpl);
  const items: InboxItem[] = [];
  const unknown: InboxItem[] = [];
  await Promise.all(products.map((p) => probeProduct(p, caller, items, unknown, fetchImpl)));
  items.sort(rank);
  unknown.sort(rank);
  return { items, unknown, failures, probedAt: new Date().toISOString() };
}

async function probeProduct(
  p: ProductManifest,
  caller: ContractCaller,
  items: InboxItem[],
  unknown: InboxItem[],
  fetchImpl: typeof fetch,
) {
  for (const domain of p.manifest.domains) {
    const actions = new Map(domain.actions.map((a) => [a.id, a]));
    await Promise.all(
      domain.signals.map(async (signal) => {
        let reading: SignalReading;
        try {
          reading = await probeSignal(p.manifest, signal, caller, fetchImpl);
        } catch (error) {
          reading = {
            id: signal.id,
            status: "unknown",
            severity: signal.severity,
            probedAt: new Date().toISOString(),
            detail: error instanceof Error ? error.message : "probe failed",
          };
        }
        if (reading.status === "ok") return;
        const item: InboxItem = {
          key: `${p.serviceId}:${domain.id}:${signal.id}`,
          product: p.manifest.product,
          productLabel: p.manifest.label,
          domain: domain.id,
          signal,
          reading,
          action: actions.get(reading.action ?? signal.action ?? "") ?? null,
          manifest: p.manifest,
        };
        (reading.status === "unknown" ? unknown : items).push(item);
      }),
    );
  }
}

function rank(a: InboxItem, b: InboxItem): number {
  return (
    SEVERITY_RANK[a.reading.severity] - SEVERITY_RANK[b.reading.severity] ||
    a.product.localeCompare(b.product) ||
    a.signal.id.localeCompare(b.signal.id)
  );
}
