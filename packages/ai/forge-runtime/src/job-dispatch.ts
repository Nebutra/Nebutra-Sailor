/**
 * Job dispatch modes for Forge async tools.
 *
 * - inline: fire-and-forget in the request process (default, no infra)
 * - http:   POST payload to FORGE_JOB_WORKER_URL (any HTTP worker)
 * - qstash: publish to Upstash QStash → worker URL (serverless queue)
 *
 * Worker endpoint should accept POST JSON:
 *   { jobId, toolId, input }
 * and update the job store (same process or shared Upstash store).
 */

export type JobDispatchMode = "inline" | "http" | "qstash";

export interface JobDispatchPayload {
  readonly jobId: string;
  readonly toolId: string;
  readonly input: unknown;
}

export function resolveJobDispatchMode(env: NodeJS.ProcessEnv = process.env): JobDispatchMode {
  const explicit = (env.FORGE_JOB_MODE ?? "").toLowerCase();
  if (explicit === "inline" || explicit === "http" || explicit === "qstash") {
    return explicit;
  }
  if (env.QSTASH_TOKEN && (env.FORGE_JOB_WORKER_URL || env.QSTASH_CALLBACK_BASE_URL)) {
    return "qstash";
  }
  if (env.FORGE_JOB_WORKER_URL) return "http";
  return "inline";
}

function workerUrl(env: NodeJS.ProcessEnv): string {
  if (env.FORGE_JOB_WORKER_URL) return env.FORGE_JOB_WORKER_URL;
  const base = (env.QSTASH_CALLBACK_BASE_URL || env.NEXT_PUBLIC_FORGE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("FORGE_JOB_WORKER_URL or QSTASH_CALLBACK_BASE_URL required");
  return `${base}/api/v1/jobs/worker`;
}

/**
 * Enqueue job for remote worker. Caller still owns store.create + markRunning.
 * Returns provider label for observability.
 */
export async function dispatchJob(
  payload: JobDispatchPayload,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ mode: JobDispatchMode; accepted: boolean; detail?: string }> {
  const mode = resolveJobDispatchMode(env);
  if (mode === "inline") {
    return { mode, accepted: true, detail: "inline" };
  }

  const url = workerUrl(env);
  const body = JSON.stringify(payload);

  if (mode === "http") {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.FORGE_JOB_WORKER_SECRET
          ? { "x-forge-job-secret": env.FORGE_JOB_WORKER_SECRET }
          : {}),
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP job worker ${res.status}: ${text.slice(0, 200)}`);
    }
    return { mode, accepted: true, detail: "http" };
  }

  // qstash
  const token = env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN required for qstash job mode");
  const publishUrl = `https://qstash.upstash.io/v2/publish/${encodeURIComponent(url)}`;
  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Retries": env.FORGE_JOB_MAX_RETRIES ?? "3",
      ...(env.FORGE_JOB_WORKER_SECRET
        ? { "Upstash-Forward-x-forge-job-secret": env.FORGE_JOB_WORKER_SECRET }
        : {}),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`QStash publish ${res.status}: ${text.slice(0, 200)}`);
  }
  return { mode, accepted: true, detail: "qstash" };
}
