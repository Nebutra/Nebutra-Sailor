import { MemoryPrepaidWallet, type PrepaidWallet } from "@nebutra/prepaid-wallet";

/**
 * Dev/demo wallet. Production should inject createCreditLedgerWallet(billing).
 * Seed a tenant so free-tier unitCost 0 tools still work without top-up.
 */
const globalForWallet = globalThis as unknown as {
  __nebutraForgeWallet?: MemoryPrepaidWallet;
};

export function getDemoWallet(): PrepaidWallet {
  if (!globalForWallet.__nebutraForgeWallet) {
    const wallet = new MemoryPrepaidWallet();
    wallet.seed("demo", 100);
    globalForWallet.__nebutraForgeWallet = wallet;
  }
  return globalForWallet.__nebutraForgeWallet;
}
