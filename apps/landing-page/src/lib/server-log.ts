type LogContext = Record<string, unknown> | Error | unknown;

function serializeContext(context: LogContext | undefined) {
  if (!context) return "";
  if (context instanceof Error) {
    return ` ${JSON.stringify({ message: context.message, stack: context.stack })}`;
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return ` ${String(context)}`;
  }
}

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const line = `[landing-page] ${level.toUpperCase()} ${message}${serializeContext(context)}\n`;
  const stream = level === "info" ? process.stdout : process.stderr;
  stream.write(line);
}

export const serverLog = {
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
};
