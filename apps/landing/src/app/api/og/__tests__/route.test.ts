import { describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => {
  class MockImageResponse {
    body: unknown;
    status: number;
    headers: Headers;
    constructor(_node: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = "mock-png-bytes";
      this.status = init?.status ?? 200;
      this.headers = new Headers({
        "content-type": "image/png",
        ...(init?.headers ?? {}),
      });
    }
  }
  return { ImageResponse: MockImageResponse };
});

import { GET } from "../route";

function makeRequest(qs: string) {
  return new Request(`https://nebutra.com/api/og${qs}`);
}

describe("GET /api/og", () => {
  it("returns 200 with image/png for a valid title", async () => {
    const res = await GET(makeRequest("?title=Hello%20World"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
  });

  it("sets immutable cache headers", async () => {
    const res = await GET(makeRequest("?title=Hi"));
    const cacheControl = res.headers.get("cache-control") ?? "";
    expect(cacheControl).toContain("s-maxage=31536000");
    expect(cacheControl).toContain("immutable");
  });

  it("accepts subtitle and theme params", async () => {
    const res = await GET(makeRequest("?title=Hi&subtitle=Subtitle&theme=dark"));
    expect(res.status).toBe(200);
  });

  it("returns 400 when title is missing", async () => {
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title exceeds max length", async () => {
    const longTitle = "a".repeat(201);
    const res = await GET(makeRequest(`?title=${longTitle}`));
    expect(res.status).toBe(400);
  });

  it("returns 400 when theme is invalid", async () => {
    const res = await GET(makeRequest("?title=Hi&theme=neon"));
    expect(res.status).toBe(400);
  });
});
