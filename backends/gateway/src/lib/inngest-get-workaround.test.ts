import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { rewriteInngestStepGet } from "./inngest-get-workaround";

function req(method: string, url: string, headers: Record<string, string> = {}) {
  return { method, url, headers } as unknown as IncomingMessage;
}

const signed = { "x-inngest-signature": "t=1&s=abc", "x-inngest-run-id": "run_1" };

describe("rewriteInngestStepGet", () => {
  it("relabels a signed step-execution GET on /api/inngest as POST", () => {
    const r = req("GET", "/api/inngest?fnId=f&stepId=step", signed);
    expect(rewriteInngestStepGet(r)).toBe(true);
    expect(r.method).toBe("POST");
  });

  it("leaves an unsigned GET (probe or introspection) untouched", () => {
    const r = req("GET", "/api/inngest");
    expect(rewriteInngestStepGet(r)).toBe(false);
    expect(r.method).toBe("GET");
  });

  it("needs both the signature and the run id", () => {
    const r = req("GET", "/api/inngest", { "x-inngest-signature": "t=1&s=abc" });
    expect(rewriteInngestStepGet(r)).toBe(false);
  });

  it("never touches other paths or methods", () => {
    expect(rewriteInngestStepGet(req("GET", "/api/inngestx", signed))).toBe(false);
    expect(rewriteInngestStepGet(req("PUT", "/api/inngest", signed))).toBe(false);
  });
});
