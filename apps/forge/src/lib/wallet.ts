import {
  createCreditLedgerWallet,
  MemoryPrepaidWallet,
  type PrepaidWallet,
} from "@nebutra/prepaid-wallet";

/**
 * Forge prepaid wallet — hard-correct modes:
 *
 * | Mode | When | Backend |
 * |------|------|---------|
 * | `memory` | dev/test default | in-process MemoryPrepaidWallet |
 * | `ledger` | production default | `@nebutra/billing` CreditBalance via createCreditLedgerWallet |
 *
 * Override: `FORGE_WALLET_MODE=memory|ledger`
 * Emergency only: `FORGE_ALLOW_MEMORY_WALLET=1` allows memory in production.
 */
const globalForWallet = globalThis as unknown as {
  __nebutraForgeWallet?: PrepaidWallet;
  __nebutraForgeWalletPromise?: Promise<PrepaidWallet>;
};

export type ForgeWalletMode = "memory" | "ledger";

export function resolveWalletMode(env: NodeJS.ProcessEnv = process.env): ForgeWalletMode {
  const explicit = env.FORGE_WALLET_MODE?.trim().toLowerCase();
  if (explicit === "memory" || explicit === "ledger") return explicit;
  return env.NODE_ENV === "production" ? "ledger" : "memory";
}

function createMemoryWallet(): PrepaidWallet {
  const wallet = new MemoryPrepaidWallet();
  wallet.seed("demo", 100);
  return wallet;
}

async function createLedgerWallet(): Promise<PrepaidWallet> {
  // Dynamic import keeps billing/Prisma out of the cold path for free tools in
  // unit tests that never touch the wallet.
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
    if (env.NODE_ENV === "production" && env.FORGE_ALLOW_MEMORY_WALLET !== "1") {
      throw new Error(
        "Hard-correct: MemoryPrepaidWallet is forbidden in production. " +
          "Set FORGE_WALLET_MODE=ledger (default in production) and wire DATABASE_URL, " +
          "or set FORGE_ALLOW_MEMORY_WALLET=1 only as a temporary emergency.",
      );
    }
    return createMemoryWallet();
  }

  try {
    return await createLedgerWallet();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Hard-correct: CreditLedger wallet failed to initialize (${message}). ` +
        "Ensure @nebutra/billing credits + DATABASE_URL are available, " +
        "or use FORGE_WALLET_MODE=memory only outside production.",
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

/** @deprecated Prefer getWallet(). Kept for call-site migration. */
export async function getDemoWallet(): Promise<PrepaidWallet> {
  return getWallet();
}

/** Test helper — reset process-wide wallet cache. */
export function resetWalletCacheForTests(): void {
  delete globalForWallet.__nebutraForgeWallet;
  delete globalForWallet.__nebutraForgeWalletPromise;
}
