/**
 * Thin types for Nebutra Router → supply engine adapters (New-API / Sub2API).
 * Full HTTP adapter ships with gateway integration; this locks the contract early.
 */

export type SupplyEngineKind = "newapi" | "sub2api" | "cliproxyapi" | "official";

export interface SupplyEngineEndpoint {
  readonly id: string;
  readonly kind: SupplyEngineKind;
  /** Internal base URL, e.g. http://127.0.0.1:3001 */
  readonly baseUrl: string;
  /** Optional engine-native admin/API token (never a customer sk-sailor key). */
  readonly internalTokenEnv?: string;
  readonly enabled: boolean;
}

export interface RouterUpstreamResolveInput {
  readonly model: string;
  readonly tenantId: string;
  readonly requestId: string;
}

export interface RouterUpstreamTarget {
  readonly engineId: string;
  readonly kind: SupplyEngineKind;
  readonly url: string;
  readonly headers: Record<string, string>;
  /** Engine-native model id after alias map. */
  readonly upstreamModel: string;
}

export interface ModelAliasEntry {
  readonly publicModel: string;
  readonly engineId: string;
  readonly upstreamModel: string;
  readonly priority: number;
}
