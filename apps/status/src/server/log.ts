/**
 * A tiny structured logger: one JSON line per event on stderr, which is what
 * `docker logs` and every log shipper read. The self-hosted image carries no
 * logging dependency.
 */
type Level = "debug" | "info" | "warn" | "error";

function errorFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { error: error.message, errorName: error.name };
  return error === undefined ? {} : { error: String(error) };
}

function write(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  if (level === "debug" && !process.env.STATUS_DEBUG) return;
  const { err, ...rest } = fields;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...rest,
    ...errorFields(err),
  });
  process.stderr.write(`${line}\n`);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
};
