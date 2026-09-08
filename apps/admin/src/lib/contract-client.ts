import "server-only";

import { signServiceToken } from "@nebutra/auth";
import { brand } from "@nebutra/brand/metadata";
import {
  type ActionPlan,
  ActionPlanSchema,
  type ActionRequest,
  type ActionResult,
  ActionResultSchema,
  type AdminError,
  AdminErrorSchema,
  type AdminManifest,
  AdminManifestSchema,
  type AdminSignal,
  type ResourceList,
  ResourceListSchema,
  resolveContractUrl,
  type SignalReading,
  SignalReadingSchema,
  type StaffRole,
} from "@nebutra/contracts/admin";
import { FLEET } from "./fleet";

/**
 * The platform admin's only way to talk to a product: its manifest and the
 * contract endpoints it declares. Every call is signed with the caller's
 * staff role so the product enforces the ladder, not this app.
 */

export interface ContractCaller {
  userId: string;
  role: StaffRole;
}

export interface ProductManifest {
  serviceId: string;
  manifest: AdminManifest;
}

export class ContractError extends Error {
  constructor(
    readonly code: AdminError["error"]["code"] | "network",
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const MANIFEST_TTL_MS = 60_000;
const manifestCache = new Map<string, { value: AdminManifest; expiresAt: number }>();

export function manifestOrigin(serviceId: string): string | null {
  const svc = FLEET.find((s) => s.id === serviceId);
  if (!svc?.domainKey || !svc.manifest) return null;
  const override = process.env[`ADMIN_MANIFEST_ORIGIN_${svc.domainKey.toUpperCase()}`]?.trim();
  return override || `https://${brand.domains[svc.domainKey]}`;
}

export async function loadManifest(
  serviceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminManifest | null> {
  const svc = FLEET.find((s) => s.id === serviceId);
  const origin = manifestOrigin(serviceId);
  if (!svc?.manifest || !origin) return null;
  const hit = manifestCache.get(serviceId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const res = await fetchImpl(`${origin}${svc.manifest}`, { signal: AbortSignal.timeout(6_000) });
  if (!res.ok)
    throw new ContractError(
      "upstream_unavailable",
      `${serviceId} manifest → ${res.status}`,
      res.status,
    );
  const manifest = AdminManifestSchema.parse(await res.json());
  manifestCache.set(serviceId, { value: manifest, expiresAt: Date.now() + MANIFEST_TTL_MS });
  return manifest;
}

/** Every product that declares a manifest; unreachable ones are reported, not hidden. */
export async function loadManifests(
  fetchImpl: typeof fetch = fetch,
): Promise<{ products: ProductManifest[]; failures: Array<{ serviceId: string; error: string }> }> {
  const products: ProductManifest[] = [];
  const failures: Array<{ serviceId: string; error: string }> = [];
  await Promise.all(
    FLEET.filter((s) => s.manifest).map(async (s) => {
      try {
        const manifest = await loadManifest(s.id, fetchImpl);
        if (manifest) products.push({ serviceId: s.id, manifest });
      } catch (error) {
        failures.push({
          serviceId: s.id,
          error: error instanceof Error ? error.message : "unreachable",
        });
      }
    }),
  );
  products.sort((a, b) => a.serviceId.localeCompare(b.serviceId));
  return { products, failures };
}

async function signedHeaders(caller: ContractCaller): Promise<Record<string, string>> {
  const token = await signServiceToken({ userId: caller.userId, role: caller.role });
  return {
    "x-service-token": token,
    "x-user-id": caller.userId,
    "x-role": caller.role,
    accept: "application/json",
  };
}

async function call<T>(
  manifest: AdminManifest,
  path: string,
  caller: ContractCaller,
  parse: (raw: unknown) => T,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const headers = {
    ...(await signedHeaders(caller)),
    ...(init.headers as Record<string, string> | undefined),
  };
  let res: Response;
  try {
    res = await fetchImpl(resolveContractUrl(manifest, path), {
      ...init,
      headers,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new ContractError("network", error instanceof Error ? error.message : "network");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = AdminErrorSchema.safeParse(body);
    throw new ContractError(
      parsed.success ? parsed.data.error.code : "internal",
      parsed.success ? parsed.data.error.message : `HTTP ${res.status}`,
      res.status,
    );
  }
  return parse(body);
}

export function listResource(
  manifest: AdminManifest,
  listPath: string,
  caller: ContractCaller,
  fetchImpl?: typeof fetch,
): Promise<ResourceList> {
  return call(manifest, listPath, caller, (raw) => ResourceListSchema.parse(raw), {}, fetchImpl);
}

export function probeSignal(
  manifest: AdminManifest,
  signal: AdminSignal,
  caller: ContractCaller,
  fetchImpl?: typeof fetch,
): Promise<SignalReading> {
  return call(
    manifest,
    signal.probe,
    caller,
    (raw) => SignalReadingSchema.parse(raw),
    {},
    fetchImpl,
  );
}

export function planAction(
  manifest: AdminManifest,
  actionUrl: string,
  input: Record<string, unknown>,
  caller: ContractCaller,
  fetchImpl?: typeof fetch,
): Promise<ActionPlan> {
  const body: ActionRequest = { mode: "plan", input };
  return call(
    manifest,
    actionUrl,
    caller,
    (raw) => ActionPlanSchema.parse(raw),
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    fetchImpl,
  );
}

export function applyAction(
  manifest: AdminManifest,
  actionUrl: string,
  input: Record<string, unknown>,
  planId: string | undefined,
  caller: ContractCaller,
  fetchImpl?: typeof fetch,
): Promise<ActionResult> {
  const body: ActionRequest = { mode: "apply", input, ...(planId ? { planId } : {}) };
  return call(
    manifest,
    actionUrl,
    caller,
    (raw) => ActionResultSchema.parse(raw),
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    fetchImpl,
  );
}

/** Test seam. */
export function _resetManifestCache(): void {
  manifestCache.clear();
}
