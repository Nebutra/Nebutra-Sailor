import {
  createCreditLedgerWallet,
  MemoryPrepaidWallet,
  type PrepaidWallet,
} from "@nebutra/prepaid-wallet";

/**
 * Forge prepaid wallet.
 *
 * Hard-correct:
 * - Default **memory** so free tools never depend on a half-wired CreditBalance.
 * - **ledger** only when `FORGE_WALLET_MODE=ledger` is explicitly set (and
 *   DATABASE_URL + app_user role work). Do not auto-pick ledger just because
 *   NODE_ENV=production — that produced 503s when `role app_user` was missing.
 */
const globalForWallet = globalThis as unknown as {
  __nebutraForgeWallet?: PrepaidWallet;
  __nebutraForgeWalletPromise?: Promise<PrepaidWallet>;
};

export type ForgeWalletMode = "memory" | "ledger";

export function resolveWalletMode(env: NodeJS.ProcessEnv = process.env): ForgeWalletMode {
  const explicit = env.FORGE_WALLET_MODE?.trim().toLowerCase();
  if (explicit === "ledger") return "ledger";
  if (explicit === "memory") return "memory";
  // Opt-in ledger only — free tool station default is in-process memory.
  return "memory";
}

function createMemoryWallet(): PrepaidWallet {
  const wallet = new MemoryPrepaidWallet();
  wallet.seed("demo", 100);
  return wallet;
}

async function createLedgerWallet(): Promise<PrepaidWallet> {
  const credits = await import("@nebutra/billing/credits");
  return createCreditLedgerWallet({
    getCreditBalance: (organizationId) => credits.getCreditBalance(organizationId),
    addCredits: (input) => credits.addCredits(input),
    deductCredits: (input) => credits.deductCredits(input),
  });
}

async function buildWallet(env: NodeJS.ProcessEnv = process.env): Promise<PrepaidWallet> {
  const mode = resolveWalletMode(env);
  if (mode === "memory") {
    return createMemoryWallet();
  }

  try {
    return await createLedgerWallet();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Hard-correct: CreditLedger wallet failed to initialize (${message}). ` +
        "Fix DATABASE_URL / app_user role, or set FORGE_WALLET_MODE=memory.",
    );
  }
}

/** Async wallet accessor — prefer this in route handlers. */
export async function getWallet(): Promise<PrepaidWallet> {
  if (globalForWallet.__nebutraForgeWallet) {
    return globalForWallet.__nebutraForgeWallet;
  }
  if (!globalForWallet.__nebutraForgeWalletPromise) {
    globalForWallet.__nebutraForgeWalletPromise = buildWallet().then((w) => {
      globalForWallet.__nebutraForgeWallet = w;
      return w;
    });
  }
  return globalForWallet.__nebutraForgeWalletPromise;
}

/** @deprecated Prefer getWallet(). */
export async function getDemoWallet(): Promise<PrepaidWallet> {
  return getWallet();
}

/** Test helper — reset process-wide wallet cache. */
export function resetWalletCacheForTests(): void {
  delete globalForWallet.__nebutraForgeWallet;
  delete globalForWallet.__nebutraForgeWalletPromise;
}
