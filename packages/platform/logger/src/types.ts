export type LogLevel = "debug" | "info" | "warn" | "error";
export type Meta = Record<string, unknown>;

export interface Logger {
  debug(msg: string, meta?: Meta): void;
  info(msg: string, meta?: Meta): void;
  warn(msg: string, meta?: Meta): void;
  error(msg: string, error?: unknown, meta?: Meta): void;
  child(bindings: Meta): Logger;
}
