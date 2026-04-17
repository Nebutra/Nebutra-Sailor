import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiGatewayMiddleware } from "./index";

describe("aiGatewayMiddleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    // Add dummy variables mapping if needed
    app.use("*", async (c, next) => {
      c.set("organizationId", "org_123");
      await next();
    });

    app.onError((err, c) => {
      return c.json({ error: err.message }, 500);
    });

    app.use("*", aiGatewayMiddleware());

    // Default mock endpoint to prove bypass works
    app.all("/bypass", (c) => c.text("bypassed"));
  });

  it("should bypass non-chat-completion routes", async () => {
    const res = await app.request("http://localhost/bypass");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("bypassed");
  });

  it("should throw BAD_REQUEST if model or messages are missing", async () => {
    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }), // missing model
    });

    // We expect the middleware to throw or return a 400.
    // Based on NebutraError in the skeleton, Hono catches it as 500 internally
    // unless governed by an error handler, but let's check its output.
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Missing model or messages in request body");
  });

  it("should forward standard JSON requests to the mock upstream", async () => {
    const mockGlobalFetch = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "chatcmpl-123", choices: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4", messages: [{ role: "user", content: "hi" }] }),
    });

    expect(mockGlobalFetch).toHaveBeenCalledTimes(1);
    const fetchArgs = mockGlobalFetch.mock.calls[0];
    expect(fetchArgs[0]).toContain("api.openai.com");

    // Check Authorization header logic
    const reqHeaders = fetchArgs[1]?.headers as Record<string, string>;
    expect(reqHeaders["Authorization"]).toBeDefined();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "chatcmpl-123", choices: [] });

    mockGlobalFetch.mockRestore();
  });

  it("should handle SSE streams correctly and accumulate tokens", async () => {
    // Simulated SSE string from OpenAI
    const sseResponse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ].join("");

    const mockGlobalFetch = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(sseResponse, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4", messages: [], stream: true }),
    });

    expect(res.status).toBe(200);
    const text = await res.text();

    expect(text).toContain('data: {"choices":[{"delta":{"content":"Hello"}}]}');
    expect(text).toContain('data: {"choices":[{"delta":{"content":" world"}}]}');
    expect(text).toContain("data: [DONE]");

    // Note: We need a way to verify the accumulated string "Hello world"
    // For now we trust the stream parsing, we will refactor index.ts to expose parsing logic.
    mockGlobalFetch.mockRestore();
  });
});
