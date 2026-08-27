/**
 * pg / Hyperdrive helpers for the thin auth-edge Worker.
 *
 * A Pool `error` with no listener becomes an unhandled isolate exception
 * (Cloudflare Error 1101). Connection timeouts must retry against a fresh
 * pool — the isolate otherwise keeps a dead client and the next OAuth
 * callback dies in a few milliseconds.
 */

export function isPgConnectFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout exceeded when trying to connect|Connection terminated|ECONNRESET|connect ETIMEDOUT|sorry, too many clients|the database system is starting up/iu.test(
    message,
  );
}

export function attachPoolErrorGuard(
  pool: { on(event: "error", listener: (err: Error) => void): void },
  onError: (err: Error) => void,
): void {
  pool.on("error", onError);
}

export async function withConnectRetry<T>(run: () => Promise<T>, reset: () => void): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isPgConnectFailure(error)) throw error;
    reset();
    return await run();
  }
}
