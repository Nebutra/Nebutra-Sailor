import { readFileSync } from "node:fs";
import { join } from "node:path";
import { glob } from "tinyglobby";
import { describe, expect, it } from "vitest";

/**
 * Cloudflare fronts every Nebutra host, and it does not pass an origin's `502`
 * or `504` through: it substitutes its own branded HTML error page. The JSON
 * envelope we wrote — the error code and the message an operator or an API
 * client needs to act on — is discarded before the caller ever sees it. The
 * admin console reported this as `network · HTTP 502` for a supply login whose
 * real cause was several layers upstream.
 *
 * So an origin route never answers with a gateway status. An upstream that
 * failed is `503`; a fault of our own is `500`. Both reach the caller intact.
 */
const ROOT = join(import.meta.dirname, "..", "..");
const GATEWAY_STATUS = /(?:^|[\s([{,:])(502|504)(?=\s*[,)\];]|$)/;

describe("origin routes never answer with a gateway status", () => {
  it("has no 502 or 504 response status in an API route", async () => {
    const files = await glob(["apps/*/src/app/api/**/route.ts", "apps/*/src/lib/**/*.ts"], {
      cwd: ROOT,
      ignore: ["**/*.test.ts", "**/node_modules/**"],
    });
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
        if (
          !/status|refuse\(|json\(|Response|NextResponse/.test(line) &&
          !/^\s*50[24],\s*$/.test(line)
        )
          return;
        if (GATEWAY_STATUS.test(line)) offenders.push(`${file}:${i + 1} — ${line.trim()}`);
      });
    }
    expect(offenders, "use 503 for an upstream failure and 500 for our own").toEqual([]);
  });
});
