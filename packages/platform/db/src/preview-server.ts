/**
 * Make sure the preview database is listening before the first connection.
 *
 * Loaded only by `client.ts` in preview mode (`preview-mode.ts`), through a
 * dynamic `import("#preview-db-server")` inside the pool's first `connect` —
 * with a real `DATABASE_URL` this module is never evaluated. Workers resolve
 * the specifier to `preview-server.workerd.ts`.
 *
 * The usual path: `pnpm dev` already started the database (`pnpm db:preview`)
 * and the port answers at once. When a single app is started on its own, the
 * first process to need the database starts it — detached, so web and gateway
 * in separate processes share one — and it exits by itself after ten idle
 * minutes. PGlite itself is never imported here: it lives in that process.
 */
import type { PreviewDatabase } from "./preview-mode";

const SCRIPT = ["scripts", "preview-db.mjs"];
const IDLE_EXIT_MS = 10 * 60_000;
const START_TIMEOUT_MS = 180_000;

let announced = false;

async function portOpen(port: number): Promise<boolean> {
  const { connect } = await import("node:net");
  return new Promise((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

/**
 * The project root is the nearest pnpm workspace above the cwd (else the cwd)
 * — the same rule scripts/preview-db.mjs uses to place `.nebutra/pglite/`. The
 * script is the monorepo's own, else the installed `@nebutra/db`'s.
 */
async function locate(): Promise<{ script: string; root: string } | null> {
  const { existsSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const up = function* (from: string) {
    let dir = from;
    for (;;) {
      yield dir;
      const parent = dirname(dir);
      if (parent === dir) return;
      dir = parent;
    }
  };
  let root = process.cwd();
  for (const dir of up(process.cwd())) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      root = dir;
      break;
    }
  }
  const candidates = [join(root, "packages", "platform", "db", ...SCRIPT)];
  for (const dir of up(process.cwd())) {
    candidates.push(join(dir, "node_modules", "@nebutra", "db", ...SCRIPT));
  }
  const script = candidates.find((path) => existsSync(path));
  return script ? { script, root } : null;
}

export async function ensurePreviewDatabase(preview: PreviewDatabase): Promise<void> {
  if (await portOpen(preview.port)) return;

  const found = await locate();
  if (!found) {
    throw new Error(
      `[db] DATABASE_URL is not set and no preview database answers on 127.0.0.1:${preview.port}. ` +
        "Set DATABASE_URL, or start one with `pnpm db:preview`.",
    );
  }

  const [{ spawn }, { mkdirSync, openSync }, { join }] = await Promise.all([
    import("node:child_process"),
    import("node:fs"),
    import("node:path"),
  ]);
  const logDir = join(found.root, ".nebutra", "pglite");
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, "server.log");
  const log = openSync(logFile, "a");
  const child = spawn(
    process.execPath,
    [found.script, "serve", "--idle-exit", String(IDLE_EXIT_MS), "--port", String(preview.port)],
    { cwd: found.root, detached: true, stdio: ["ignore", log, log], env: process.env },
  );
  child.unref();
  let exited: number | null = null;
  child.once("exit", (code) => {
    exited = code ?? 1;
  });

  if (!announced) {
    announced = true;
    process.stderr.write(
      `[db] DATABASE_URL is not set — starting the local preview database (PGlite) on 127.0.0.1:${preview.port}, log ${logFile}. The first start builds it from migrations.\n`,
    );
  }

  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await portOpen(preview.port)) return;
    // Another process may have won the race to start it; that one's port opening is what counts.
    if (exited !== null && exited !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (await portOpen(preview.port)) return;
      throw new Error(`[db] the preview database did not start (exit ${exited}); see ${logFile}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `[db] the preview database did not start within ${START_TIMEOUT_MS / 1000}s; see ${logFile}`,
  );
}
