/**
 * API key scopes for Nebutra Router (models) and Forge (tools).
 * Empty scopes = unrestricted (legacy keys); product keys should set explicit scopes.
 */

import { PrepaidWalletError } from "./errors";

export const API_KEY_PREFIX = "sk-sailor-" as const;

/** Canonical scope strings. */
export const API_SCOPES = {
  MODELS: "models",
  MODELS_ALL: "models:*",
  TOOLS: "tools",
  TOOLS_ALL: "tools:*",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES] | (string & {});

export type ProductSurface = "router" | "forge";

/** Default scopes when creating a full-access product key. */
export const DEFAULT_PRODUCT_SCOPES: readonly string[] = [
  API_SCOPES.MODELS_ALL,
  API_SCOPES.TOOLS_ALL,
];

function scopeMatches(granted: string, required: string): boolean {
  if (granted === required) return true;
  if (granted.endsWith(":*")) {
    const root = granted.slice(0, -2);
    return required === root || required.startsWith(`${root}:`) || required === granted;
  }
  if (required.endsWith(":*")) {
    const root = required.slice(0, -2);
    return granted === root || granted.startsWith(`${root}:`);
  }
  return false;
}

/**
 * Returns true if the key may access the required scope.
 * Empty `granted` means unrestricted (backward compatible with existing keys).
 */
export function hasScope(granted: readonly string[], required: string): boolean {
  if (granted.length === 0) return true;
  return granted.some((g) => scopeMatches(g, required));
}

/** Scope required for a product surface. */
export function requiredScopeForProduct(product: ProductSurface): string {
  return product === "router" ? API_SCOPES.MODELS_ALL : API_SCOPES.TOOLS_ALL;
}

export function assertScope(granted: readonly string[], required: string): void {
  if (!hasScope(granted, required)) {
    throw new PrepaidWalletError("insufficient_scope", `API key missing scope: ${required}`);
  }
}
