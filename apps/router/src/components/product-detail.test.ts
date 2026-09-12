import { describe, expect, it } from "vitest";
import { isAllowedEdgePath } from "@/lib/openai-edge";

/**
 * The detail page tells a customer which endpoint to call. It used to name
 * `/v1/chat/completions` for every model, including image SKUs that answer only
 * on `/v1/images/*` — so the first request a customer copied from us could not
 * succeed, and the failure looked like ours rather than a wrong instruction.
 *
 * Two things have to hold: the path must be one the edge actually relays, and
 * an image model must not be sent to a chat endpoint.
 */

/** Mirrors the `apis` memo in product-detail.tsx. */
function endpointsFor(category: string): string[] {
  if (category === "image") return ["/v1/images/generations", "/v1/images/edits"];
  if (category === "audio") return ["/v1/audio/speech", "/v1/audio/transcriptions"];
  if (category === "data") return ["/v1/embeddings"];
  return ["/v1/chat/completions", "/v1/responses"];
}

const CATEGORIES = ["chat", "reasoning", "fast", "multimodal", "image", "audio", "data", "other"];

describe("the detail page names an endpoint the edge will relay", () => {
  for (const category of CATEGORIES) {
    it(`${category} routes to paths on the edge allow-list`, () => {
      for (const path of endpointsFor(category)) {
        const segments = path.replace(/^\/v1\//, "").split("/");
        expect(isAllowedEdgePath(segments), `${path} must be relayable`).toBe(true);
      }
    });
  }

  it("never sends an image model to a chat endpoint", () => {
    expect(endpointsFor("image").some((p) => p.includes("chat"))).toBe(false);
    expect(endpointsFor("image")).toContain("/v1/images/generations");
  });
});
