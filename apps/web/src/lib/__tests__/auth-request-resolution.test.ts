import { describe, expect, it } from "vitest";
import { createServerRequestFromHeaders, resolveServerRequestOrigin } from "@/lib/auth";

describe("server request resolution", () => {
  it("prefers forwarded host/proto when rebuilding a Request", () => {
    const requestHeaders = new Headers({
      "x-forwarded-host": "workspace.nebutra.dev",
      "x-forwarded-proto": "http",
      cookie: "session=abc123",
    });

    const request = createServerRequestFromHeaders(requestHeaders, "https://fallback.example");

    expect(request.url).toBe("http://workspace.nebutra.dev/");
    expect(request.headers.get("cookie")).toBe("session=abc123");
  });

  it("falls back to the provided app origin when forwarded host is missing", () => {
    const requestHeaders = new Headers({
      host: "localhost:3001",
    });

    expect(resolveServerRequestOrigin(requestHeaders, "http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });
});
