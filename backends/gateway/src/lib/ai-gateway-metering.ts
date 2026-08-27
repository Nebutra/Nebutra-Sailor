import type { WorkerDeps } from "@nebutra/gateway-core";
import { AI_TOKENS, getMetering, type MeteringProvider } from "@nebutra/metering";

type IngestUsage = NonNullable<WorkerDeps["ingestUsage"]>;

interface AiGatewayMeteringDeps {
  getMetering?: () => Promise<MeteringProvider>;
}

export function createAiGatewayIngestUsage(deps: AiGatewayMeteringDeps = {}): IngestUsage {
  const resolveMetering = deps.getMetering ?? getMetering;
  let defineMeterPromise: Promise<void> | null = null;

  async function ensureAiTokensMeter(metering: MeteringProvider) {
    if (!defineMeterPromise) {
      defineMeterPromise = metering.defineMeter(AI_TOKENS).catch((error) => {
        defineMeterPromise = null;
        throw error;
      });
    }
    await defineMeterPromise;
  }

  return async (event) => {
    const metering = await resolveMetering();
    await ensureAiTokensMeter(metering);
    await metering.ingest({
      ...event,
      meterId: AI_TOKENS.id,
    });
  };
}
