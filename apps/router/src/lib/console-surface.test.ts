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
      "console/v1/chat",
    ]) {
      expect(existsSync(path.join(appDir, route, "route.ts")), route).toBe(true);
    }
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
