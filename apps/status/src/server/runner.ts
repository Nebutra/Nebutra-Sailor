/**
 * What the server process does on boot: apply `status.config.json`, then run
 * the monitor loop.
 *
 * The loop ticks every 10 s. A tick claims the runner lease first, so with
 * several replicas only the holder probes; ticks never overlap, because the
 * next one is scheduled only after the current one finishes.
 */
import { readFile } from "node:fs/promises";
import { hostname } from "node:os";
import { applyConfig, ConfigError } from "./config";
import type { StatusDb } from "./db";
import { log } from "./log";
import { claimLease, runDueMonitors } from "./monitors";
import {
  componentNotificationsEnabled,
  enqueueComponentChanges,
  enqueueMaintenanceStarts,
  processDeliveries,
} from "./notify/outbox";

export const TICK_MS = 10_000;
export const LEASE_TTL_SECONDS = 30;

/** Read and apply the config file. Errors are logged, never thrown: a bad file must not keep pages down. */
export async function applyConfigFile(db: StatusDb, file: string): Promise<boolean> {
  try {
    const raw = JSON.parse(await readFile(file, "utf8"));
    const { page } = await applyConfig(db, raw);
    log.info("config applied", { file, page: page.slug });
    return true;
  } catch (error) {
    const issues =
      error && typeof error === "object" && "issues" in error
        ? (error as { issues: unknown }).issues
        : undefined;
    log.error("config not applied", {
      file,
      err: error,
      ...(issues ? { issues } : {}),
      kind:
        error instanceof ConfigError ? "config" : error instanceof SyntaxError ? "json" : "other",
    });
    return false;
  }
}

export interface Runner {
  stop(): Promise<void>;
  /** Resolves when the in-flight tick (if any) has finished. */
  idle(): Promise<void>;
}

export function defaultHolder(): string {
  return `${hostname()}:${process.pid}`;
}

export interface RunnerOptions {
  holder?: string;
  tickMs?: number;
  leaseTtlSeconds?: number;
  tick?: (db: StatusDb) => Promise<unknown>;
}

/**
 * One tick: hold the lease, then run what is due — monitors, maintenance
 * reminders, component-change notices (when on), and the delivery outbox.
 * Each step is isolated so one failing does not starve the others. Returns
 * whether this process held the lease.
 */
export async function runTick(
  db: StatusDb,
  holder: string,
  leaseTtlSeconds = LEASE_TTL_SECONDS,
): Promise<boolean> {
  if (!(await claimLease(db, holder, leaseTtlSeconds))) return false;
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      log.error("runner step failed", { step: name, holder, err: error });
    }
  };
  await step("monitors", async () => {
    for (const change of await runDueMonitors(db)) {
      log.info("component evidence changed", { ...change });
    }
  });
  await step("maintenance", () => enqueueMaintenanceStarts(db));
  if (componentNotificationsEnabled()) {
    await step("component-changes", () => enqueueComponentChanges(db));
  }
  await step("deliveries", async () => {
    const run = await processDeliveries(db);
    if (run.sent + run.retried + run.dead > 0) log.info("deliveries processed", { ...run });
  });
  return true;
}

export function startRunner(db: StatusDb, options: RunnerOptions = {}): Runner {
  const holder = options.holder ?? defaultHolder();
  const tickMs = options.tickMs ?? TICK_MS;
  const tick = options.tick ?? ((d: StatusDb) => runTick(d, holder, options.leaseTtlSeconds));
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> = Promise.resolve();

  const loop = () => {
    if (stopped) return;
    inFlight = tick(db)
      .then(() => undefined)
      .catch((error: unknown) => log.error("monitor tick failed", { holder, err: error }))
      .finally(() => {
        if (!stopped) {
          timer = setTimeout(loop, tickMs);
          timer.unref?.();
        }
      });
  };
  loop();
  log.info("monitor runner started", { holder, tickMs });

  return {
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await inFlight;
    },
    idle: () => inFlight,
  };
}

/**
 * Settings the instance cannot run correctly without. In production, links in
 * notifications, feeds and compat payloads must name the public origin; a
 * localhost fallback there would mail customers dead links.
 */
export function bootConfigProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];
  if (env.NODE_ENV === "production" && !env.STATUS_PUBLIC_URL?.trim()) {
    problems.push(
      "STATUS_PUBLIC_URL is required in production (the public origin, e.g. https://status.example.com)",
    );
  }
  return problems;
}

/** Boot sequence, called once from instrumentation.ts in the Node runtime. */
export async function boot(
  db: StatusDb,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Runner | null> {
  const file = env.STATUS_CONFIG_FILE?.trim();
  if (file) await applyConfigFile(db, file);
  if (env.STATUS_RUNNER?.trim().toLowerCase() === "off") {
    log.info("monitor runner disabled", { reason: "STATUS_RUNNER=off" });
    return null;
  }
  return startRunner(db);
}
