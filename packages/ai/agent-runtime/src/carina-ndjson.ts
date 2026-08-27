/**
 * Carina native transport: newline-delimited JSON-RPC 2.0 over a Unix socket
 * (same wire as @carina/sdk and `carina-daemon -socket`).
 *
 * Node-only — not for edge runtimes without `node:net`.
 */

import { createConnection, type Socket } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";

export const defaultCarinaSocketPath = (): string => join(homedir(), ".carina", "daemon.sock");

/** Production co-deploy layout on the Sailor ECS api host. */
export const CODEPLOY_CARINA_SOCKET_PATH = "/var/carina/run/daemon.sock";
export const CODEPLOY_CARINA_WORKSPACE_ROOT = "/var/carina/ws";
export const CODEPLOY_CARINA_STATE_DIR = "/var/carina/state";
export const CODEPLOY_CARINA_BIN_DIR = "/var/carina/bin";

export class CarinaNdjsonError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "CarinaNdjsonError";
  }
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type NdjsonRpcClient = {
  call: <T>(method: string, params: Record<string, unknown>) => Promise<T>;
  close: () => void;
};

/**
 * Create a reusable NDJSON JSON-RPC client for a Carina unix socket.
 */
export function createCarinaNdjsonClient(
  socketPath: string,
  callTimeoutMs = 30_000,
): NdjsonRpcClient {
  let socket: Socket | null = null;
  let connecting: Promise<void> | null = null;
  let nextId = 0;
  let buffer = "";
  const pending = new Map<number, Pending>();

  const failAll = (err: Error): void => {
    for (const [id, p] of pending) {
      clearTimeout(p.timer);
      p.reject(err);
      pending.delete(id);
    }
  };

  const onData = (chunk: string): void => {
    buffer += chunk;
    for (;;) {
      const nl = buffer.indexOf("\n");
      if (nl < 0) break;
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg: {
        id?: number | string;
        result?: unknown;
        error?: { code: number; message: string };
      };
      try {
        msg = JSON.parse(line) as typeof msg;
      } catch {
        continue;
      }
      if (msg.id === undefined || msg.id === null) continue;
      const id = typeof msg.id === "number" ? msg.id : Number(msg.id);
      const p = pending.get(id);
      if (!p) continue;
      pending.delete(id);
      clearTimeout(p.timer);
      if (msg.error) {
        p.reject(
          new CarinaNdjsonError(
            `Carina RPC failed (${msg.error.code}): ${msg.error.message}`,
            502,
            String(msg.error.code),
          ),
        );
        continue;
      }
      p.resolve(msg.result);
    }
  };

  const connect = async (): Promise<void> => {
    if (socket && !socket.destroyed) return;
    if (connecting) return connecting;
    connecting = new Promise<void>((resolve, reject) => {
      const s = createConnection(socketPath);
      const onFail = (error: Error): void => {
        s.destroy();
        reject(
          new CarinaNdjsonError(
            `cannot reach carina-daemon at ${socketPath}: ${error.message}`,
            503,
            "transport_error",
          ),
        );
      };
      s.once("error", onFail);
      s.once("connect", () => {
        s.off("error", onFail);
        socket = s;
        s.setEncoding("utf8");
        s.on("data", (chunk: string | Buffer) => onData(String(chunk)));
        s.on("error", (error) => {
          failAll(
            new CarinaNdjsonError(
              `carina-daemon socket error: ${error.message}`,
              503,
              "transport_error",
            ),
          );
          socket = null;
        });
        s.on("close", () => {
          failAll(new CarinaNdjsonError("carina-daemon connection closed", 503, "transport_error"));
          socket = null;
        });
        resolve();
      });
    }).finally(() => {
      connecting = null;
    });
    return connecting;
  };

  return {
    async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
      await connect();
      const s = socket;
      if (!s || s.destroyed) {
        throw new CarinaNdjsonError("carina-daemon is disconnected", 503, "transport_error");
      }
      const id = ++nextId;
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(
            new CarinaNdjsonError(
              `Carina RPC ${method} timed out after ${callTimeoutMs}ms`,
              504,
              "timeout",
            ),
          );
        }, callTimeoutMs);
        pending.set(id, {
          timer,
          resolve: (v) => resolve(v as T),
          reject,
        });
        s.write(payload, (error) => {
          if (!error) return;
          const p = pending.get(id);
          if (!p) return;
          pending.delete(id);
          clearTimeout(p.timer);
          p.reject(
            new CarinaNdjsonError(
              `Carina RPC ${method} write failed: ${error.message}`,
              503,
              "transport_error",
            ),
          );
        });
      });
    },
    close(): void {
      failAll(new CarinaNdjsonError("carina ndjson client closed", 503, "closed"));
      socket?.destroy();
      socket = null;
    },
  };
}
