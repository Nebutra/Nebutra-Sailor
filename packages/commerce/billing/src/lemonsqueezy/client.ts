import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

let initialized = false;
let _storeId: string | null = null;

export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  onError?: (error: Error) => void;
}

/**
 * Initialize the LemonSqueezy SDK
 */
export function initLemonSqueezy(config: LemonSqueezyConfig): void {
  lemonSqueezySetup({
    apiKey: config.apiKey,
    onError: config.onError,
  });
  _storeId = config.storeId;
  initialized = true;
}

/**
 * Get the LemonSqueezy store configuration.
 * Auto-initializes from environment variables if not already initialized.
 */
export function getLemonSqueezyConfig(): { storeId: string } {
  if (!initialized) {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      throw new Error(
        "LemonSqueezy credentials not configured (LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID)",
      );
    }
    initLemonSqueezy({ apiKey, storeId });
    return { storeId };
  }
  if (!_storeId) {
    throw new Error("LemonSqueezy storeId not configured");
  }
  return { storeId: _storeId };
}
