/**
 * Minimal local HTTP server standing in for the auth center's Better Auth
 * `deviceAuthorization` + `bearer` endpoints, for CLI device-flow tests.
 * Only implements the surface `packages/ops/cli/src/utils/device-auth.ts`
 * talks to — not a Better Auth reimplementation.
 */

import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";

interface DeviceRecord {
  deviceCode: string;
  userCode: string;
  status: "pending" | "approved" | "denied";
  pollCount: number;
  expiresAt: number;
}

export interface MockAuthServerScript {
  /** How many `/device/token` polls return `authorization_pending` before
   * the code is (auto-)approved. 0 = approved on the first poll. */
  pendingPolls?: number;
  /** Return `slow_down` on this 1-indexed poll number (once). */
  slowDownOnPoll?: number;
  /** Deny instead of approve once `pendingPolls` is reached. */
  denyAfterPending?: boolean;
  /** Device code TTL in seconds — small values let tests exercise
   * `expired_token` quickly. */
  expiresInSeconds?: number;
  intervalSeconds?: number;
  userId?: string;
  email?: string;
  name?: string;
}

export interface MockAuthServer {
  url: string;
  close: () => Promise<void>;
  /** Requests received, in order — for assertions (e.g. rate-limit-style
   * poll-count checks) without a real rate limiter. */
  requests: Array<{ method: string; path: string }>;
}

export async function startMockAuthServer(
  script: MockAuthServerScript = {},
): Promise<MockAuthServer> {
  const pendingPolls = script.pendingPolls ?? 0;
  const expiresInSeconds = script.expiresInSeconds ?? 600;
  const intervalSeconds = script.intervalSeconds ?? 0; // 0 so tests don't wait real seconds
  const userId = script.userId ?? "user_test_1";
  const email = script.email ?? "agent@example.com";
  const name = script.name ?? "Test Agent";

  const devices = new Map<string, DeviceRecord>();
  const issuedTokens = new Map<string, string>(); // access_token -> deviceCode
  const requests: MockAuthServer["requests"] = [];

  function readBody(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  }

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://localhost");
      requests.push({ method: req.method ?? "GET", path: url.pathname });

      if (req.method === "POST" && url.pathname === "/api/auth/device/code") {
        const body = await readBody(req);
        if (body.client_id !== "nebutra-cli") {
          return json(res, 400, {
            error: "invalid_client",
            error_description: "Invalid client ID",
          });
        }
        const deviceCode = randomBytes(16).toString("hex");
        const userCode = randomBytes(4).toString("hex").toUpperCase();
        devices.set(deviceCode, {
          deviceCode,
          userCode,
          status: "pending",
          pollCount: 0,
          expiresAt: Date.now() + expiresInSeconds * 1000,
        });
        return json(res, 200, {
          device_code: deviceCode,
          user_code: userCode,
          verification_uri: "http://localhost/device",
          verification_uri_complete: `http://localhost/device?user_code=${userCode}`,
          expires_in: expiresInSeconds,
          interval: intervalSeconds,
        });
      }

      if (req.method === "POST" && url.pathname === "/api/auth/device/token") {
        const body = await readBody(req);
        const record = devices.get(String(body.device_code));
        if (!record) {
          return json(res, 400, {
            error: "invalid_grant",
            error_description: "Invalid device code",
          });
        }
        if (record.expiresAt < Date.now()) {
          return json(res, 400, {
            error: "expired_token",
            error_description: "Device code expired",
          });
        }
        record.pollCount++;

        if (script.slowDownOnPoll === record.pollCount) {
          return json(res, 400, {
            error: "slow_down",
            error_description: "Polling too frequently",
          });
        }

        if (record.pollCount <= pendingPolls) {
          return json(res, 400, {
            error: "authorization_pending",
            error_description: "Authorization pending",
          });
        }

        if (record.status === "pending") {
          record.status = script.denyAfterPending ? "denied" : "approved";
        }

        if (record.status === "denied") {
          return json(res, 400, {
            error: "access_denied",
            error_description: "The user denied the request",
          });
        }

        const accessToken = randomBytes(16).toString("hex");
        issuedTokens.set(accessToken, record.deviceCode);
        return json(res, 200, {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "",
        });
      }

      if (req.method === "GET" && url.pathname === "/api/auth/get-session") {
        const auth = req.headers.authorization ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
        if (!token || !issuedTokens.has(token)) {
          return json(res, 401, { error: "unauthorized" });
        }
        return json(res, 200, {
          session: { token },
          user: { id: userId, email, name },
        });
      }

      json(res, 404, { error: "not_found" });
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
