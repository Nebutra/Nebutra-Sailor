import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isRouterSupplyConfigured,
  openaiError,
  proxyOpenAiCompatible,
  RouterSupplyUnavailableError,
  requireRouterSupply,
} from "./openai-edge";

describe("router OpenAI edge", () => {
  const keys = ["NEW_API_BASE_URL", "NEBUTRA_NEW_API_URL"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it("fails closed without New-API", () => {
    delete process.env.NEW_API_BASE_URL;
    delete process.env.NEBUTRA_NEW_API_URL;
    expect(isRouterSupplyConfigured()).toBe(false);
    expect(() => requireRouterSupply()).toThrow(RouterSupplyUnavailableError);
  });

  it("rejects a request with no router key", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/models"),
      ["models"],
    );
    expect(response.status).toBe(401);
  });

  it("forwards 302.ai image-edit multipart to New-API unchanged", async () => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
    const body = new FormData();
    body.set("model", "gpt-image-2");
    body.set("prompt", "keep the same person");
    body.set("size", "1024x1536");
    body.set("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "portrait.png");

    const fetchImpl: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://127.0.0.1:3001/v1/images/edits");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-router-product");
      expect(new Headers(init?.headers).get("content-type")).toMatch(/multipart\/form-data/);
      expect(init?.body).toBeTruthy();
      return new Response(JSON.stringify({ data: [{ b64_json: "QQ==" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const request = new Request("https://router.nebutra.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer sk-router-product" },
      body,
    });
    const response = await proxyOpenAiCompatible(request, ["images", "edits"], fetchImpl);
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const payload = (await response.json()) as { data: Array<{ b64_json: string }> };
    expect(payload.data[0]?.b64_json).toBe("QQ==");
  });

  it("shapes errors like the OpenAI / 302.ai envelope", async () => {
    const response = openaiError(503, "router_unconfigured");
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { message: "router_unconfigured", type: "server_error" },
    });
  });
});
