import "server-only";

import type { ContractCaller } from "./contract-client";
import { FLEET } from "./fleet";
import { buildInbox, type InboxResult } from "./inbox";
import { probeFleet } from "./probe";

/**
 * Shared reads for the shell and the pages. The tab row needs the inbox
 * count on every route, so the inbox is memoised for the same window the
 * fleet probe uses (30 s) — "Next probe in 30 s" is a fact, not a promise.
 */
const INBOX_TTL_MS = 30_000;
let inboxCache: { role: string; value: InboxResult; expiresAt: number } | null = null;

export async function cachedInbox(caller: ContractCaller, force = false): Promise<InboxResult> {
  if (!force && inboxCache && inboxCache.role === caller.role && inboxCache.expiresAt > Date.now())
    return inboxCache.value;
  const value = await buildInbox(caller);
  inboxCache = { role: caller.role, value, expiresAt: Date.now() + INBOX_TTL_MS };
  return value;
}

export function cachedFleet(force = false) {
  return probeFleet(fetch, force);
}

export const fleetSize = FLEET.length;

export function _resetConsoleCache(): void {
  inboxCache = null;
}
