import { existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The console must not sit on the public relay surface.
 *
 * `next.config.ts` rewrites `/v1/:path*` onto `/api/v1/:path*`. While the
 * console lived under `/api/v1/*`, `POST /v1/wallet/topup` and `GET /v1/keys`
 * were reachable from the open internet with no session at all — a public
 * mutation on a wallet. The console now lives under `/api/console/v1/*`, which
 * no `/v1/...` URL can reach, and the relay answers 404 for anything outside
 * its allow-list.
 */

const appDir = path.resolve(__dirname, "..", "app", "api");

describe("console routes are off the public /v1 surface", () => {
  it("keeps no console route under the rewrite target", () => {
    for (const leaked of ["v1/wallet", "v1/wallet/topup", "v1/keys", "v1/chat"]) {
      expect(existsSync(path.join(appDir, leaked, "route.ts")), leaked).toBe(false);
    }
  });

  it("serves them under /api/console/v1 instead", () => {
    for (const route of [
      "console/v1/wallet",
      "console/v1/wallet/topup",
      "console/v1/keys",
      "console/v1/keys/[id]",
      "console/v1/keys/[id]/logs",
      "console/v1/chat",
      "console/v1/usage/summary",
      "console/v1/usage/by-model",
      "console/v1/usage/by-key",
      "console/v1/usage/history",
      "console/v1/usage/records",
      "console/v1/usage/export",
    ]) {
      expect(existsSync(path.join(appDir, route, "route.ts")), route).toBe(true);
    }
  });

  it("keeps no console route under the rewrite target, at any depth", () => {
    for (const leaked of [
      "v1/wallet",
      "v1/wallet/topup",
      "v1/keys",
      "v1/chat",
      "v1/usage",
      "v1/usage/summary",
    ]) {
      expect(existsSync(path.join(appDir, leaked, "route.ts")), leaked).toBe(false);
    }
  });

  /**
   * `/v1/limits` is the one addition to the public surface: it is
   * key-authenticated, not session-authenticated, because its audience is the
   * program holding the key. As a static segment it takes precedence over the
   * `[...path]` relay, so it is answered here and never forwarded upstream.
   */
  it("serves /v1/limits as a static route, not through the relay", () => {
    expect(existsSync(path.join(appDir, "v1", "limits", "route.ts"))).toBe(true);
  });

  describe("the relay route itself", () => {
    let route: typeof import("@/app/api/v1/[...path]/route");

    beforeAll(async () => {
      process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
      route = await import("@/app/api/v1/[...path]/route");
    });

    it.each([
      ["wallet", "topup"],
      ["wallet"],
      ["keys"],
      ["keys", "abc"],
      ["chat"],
      ["usage"],
      ["usage", "summary"],
      ["usage", "export"],
    ])("answers 404 for /v1/%s", async (...segments: string[]) => {
      const response = await route.POST(
        new Request(`https://router.nebutra.com/v1/${segments.join("/")}`, {
          method: "POST",
          headers: { Authorization: "Bearer sk-sailor", "content-type": "application/json" },
          body: "{}",
        }),
        { params: Promise.resolve({ path: segments }) },
      );
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "unknown_endpoint" },
      });
    });
  });
});
