import { existsSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CAPABILITY_POLICY } from "./policy";
import {
  createCarinaSandbox,
  isCarinaSandbox,
  REFUSING_SANDBOX,
  resolveCarinaSandboxFromEnv,
} from "./sandbox";

describe("carina ndjson + co-deploy resolve", () => {
  const dirs: string[] = [];
  let server: Server | null = null;

  afterEach(() => {
    if (server) {
      // Do not await close — open NDJSON clients keep the server from draining.
      try {
        server.close();
      } catch {
        /* ignore */
      }
      server = null;
    }
    for (const d of dirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("resolveCarinaSandboxFromEnv refuses when CARINA_CODEPLOY=0", () => {
    expect(resolveCarinaSandboxFromEnv({ CARINA_CODEPLOY: "0" })).toBe(REFUSING_SANDBOX);
  });

  it("resolveCarinaSandboxFromEnv defaults to co-deploy socket", () => {
    expect(isCarinaSandbox(resolveCarinaSandboxFromEnv({}))).toBe(true);
  });

  it("createCarinaSandbox over unix NDJSON does hello + session + exec", {
    timeout: 15_000,
  }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "carina-sock-"));
    dirs.push(dir);
    const sockPath = join(dir, "daemon.sock");
    if (existsSync(sockPath)) unlinkSync(sockPath);

    server = createServer((conn) => {
      let buf = "";
      conn.setEncoding("utf8");
      conn.on("data", (chunk: string) => {
        buf += chunk;
        for (;;) {
          const nl = buf.indexOf("\n");
          if (nl < 0) break;
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const req = JSON.parse(line) as {
            id: number;
            method: string;
            params?: Record<string, unknown>;
          };
          let result: unknown = {};
          if (req.method === "gateway.hello") {
            result = { protocol_version: 1 };
          } else if (req.method === "session.create") {
            result = { session_id: "sess_sock", status: "active" };
          } else if (req.method === "command.exec") {
            expect(req.params?.session_id).toBe("sess_sock");
            result = {
              decision: { decision: "allowed", decision_id: "d1" },
              result: { exit_code: 0, stdout: ["ok\n"], stderr: [] },
            };
          } else {
            conn.write(
              JSON.stringify({
                jsonrpc: "2.0",
                id: req.id,
                error: { code: -32601, message: `unknown ${req.method}` },
              }) + "\n",
            );
            continue;
          }
          conn.write(JSON.stringify({ jsonrpc: "2.0", id: req.id, result }) + "\n");
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      server!.listen(sockPath, () => resolve());
      server!.once("error", reject);
    });

    const sandbox = createCarinaSandbox({ socketPath: sockPath });
    await sandbox.ensureSession({ threadId: "th", workspaceRoot: "/tmp/ws" });
    const result = await sandbox.exec({
      tenantId: "org",
      threadId: "th",
      command: "echo ok",
      capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
    });
    expect(result.exitCode).toBe(0);
    expect(result.aggregatedOutput).toBe("ok\n");
  });
});
