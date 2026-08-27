import { Polar } from "@polar-sh/sdk";

let polarClient: Polar | null = null;

export interface PolarConfig {
  accessToken: string;
  server?: "production" | "sandbox";
}

/**
 * Initialize the Polar client
 */
export function initPolar(config: PolarConfig): Polar {
  polarClient = new Polar({
    accessToken: config.accessToken,
    server: config.server ?? "production",
  });
  return polarClient;
}

/**
 * Get the Polar client instance
 */
export function getPolar(): Polar {
  if (!polarClient) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Polar not initialized. Call initPolar() or set POLAR_ACCESS_TOKEN");
    }
    return initPolar({
      accessToken,
      server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
    });
  }
  return polarClient;
}

// Re-export Polar type
export type { Polar };
export default getPolar;
