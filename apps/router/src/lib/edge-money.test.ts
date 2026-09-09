import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type EdgeAdmission,
  type EdgeGuard,
  type EdgeRefusalRecord,
  type EdgeSettleInput,
  isBillable,
  modelCandidates,
  parseUsage,
  proxyOpenAiCompatible,
  readRequestBody,
  scanMultipartModel,
} from "./openai-edge";

const identity = { keyId: "key_1", tenantId: "tenant_1", userId: "user_1" };
const admission: EdgeAdmission = { reserved: 0.02, currency: "USD", candidates: ["gpt-5"] };

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

function fakeGuard(over: Partial<EdgeGuard> = {}) {
  const settled: EdgeSettleInput[] = [];
  const refused: EdgeRefusalRecord[] = [];
  const abandoned: string[] = [];
  const guard: EdgeGuard = {
    admit: vi.fn(async () => ({ ok: true as const, admission })),
    admitUnpriced: vi.fn(async () => ({ ok: true as const })),
    settle: vi.fn(async (input: EdgeSettleInput) => {
      settled.push(input);
    }),
    noteRefusal: vi.fn(async (input: EdgeRefusalRecord) => {
      refused.push(input);
    }),
    abandon: vi.fn(async (input) => {
      abandoned.push(input.requestId);
    }),
    ...over,
  };
  return { guard, settled, refused, abandoned };
}

function chatRequest(body: unknown, path = "chat/completions") {
  return new Request(`https://router.nebutra.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: "Bearer sk-sailor", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const resolveKey = async () => identity;

describe("edge money path", () => {
  const saved = process.env.NEW_API_BASE_URL;
  beforeEach(() => {
    process.env.NEW_API_BASE_URL = "http://127.0.0.1:3001/v1";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.NEW_API_BASE_URL;
    else process.env.NEW_API_BASE_URL = saved;
  });

  it("refuses before the upstream call when the guard says no, with the guard's code", async () => {
    const fetchImpl = vi.fn();
    const { guard } = fakeGuard({
      admit: vi.fn(async () => ({
        ok: false as const,
        status: 402,
        code: "insufficient_balance" as const,
        message: "Insufficient balance. Top up to continue.",
      })),
    });
    const response = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      { fetchImpl: fetchImpl as unknown as typeof fetch, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "insufficient_balance" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("settles once per request, marked billable, after the body has streamed", async () => {
    const fetchImpl: typeof fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            model: "gpt-5",
            choices: [{ finish_reason: "stop" }],
            usage: { prompt_tokens: 10, completion_tokens: 4 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const { guard, settled } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    await response.text();
    await flush();
    expect(settled).toHaveLength(1);
    expect(settled[0]).toMatchObject({ billable: true, status: 200, admission });
    expect(settled[0]?.usage).toMatchObject({ promptTokens: 10, completionTokens: 4 });
  });

  it("marks an error chunk in a streamed 200 unbillable — the zero-completion dispute", async () => {
    const sse =
      `data: ${JSON.stringify({ model: "gpt-5", choices: [{ delta: { content: "hi" } }] })}\n\n` +
      `data: ${JSON.stringify({ error: { message: "upstream exploded", type: "server_error" } })}\n\n`;
    const fetchImpl: typeof fetch = vi.fn(
      async () =>
        new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } }),
    );
    const { guard, settled } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", stream: true, messages: [] }),
      ["chat", "completions"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    const text = await response.text();
    expect(text).toContain("upstream exploded");
    await flush();
    expect(settled[0]?.billable).toBe(false);
  });

  it("settles a non-2xx as unbillable", async () => {
    const fetchImpl: typeof fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: "bad gateway" } }), {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
    );
    const { guard, settled } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    await response.text();
    await flush();
    expect(settled[0]).toMatchObject({ billable: false, status: 502 });
  });

  it("returns the whole hold when the upstream never answered", async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const { guard, abandoned } = fakeGuard();
    await expect(
      proxyOpenAiCompatible(
        chatRequest({ model: "gpt-5", messages: [] }),
        ["chat", "completions"],
        {
          fetchImpl,
          resolveKey,
          upstreamToken: "t",
          guard,
        },
      ),
    ).rejects.toThrow("ECONNREFUSED");
    expect(abandoned).toHaveLength(1);
  });

  it("falls through models[] on a retryable status and stops on the first good answer", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (_input, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string; models?: unknown };
      seen.push(body.model);
      // `models[]` is ours, not the upstream's — it must not be forwarded.
      expect(body.models).toBeUndefined();
      if (body.model === "gpt-5") return new Response("busy", { status: 429 });
      return new Response(
        JSON.stringify({
          model: body.model,
          choices: [{ finish_reason: "stop" }],
          usage: { prompt_tokens: 3, completion_tokens: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const { guard, settled } = fakeGuard({
      admit: vi.fn(async () => ({
        ok: true as const,
        admission: { ...admission, candidates: ["gpt-5", "claude-sonnet-4-5"] },
      })),
    });
    const response = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", models: ["claude-sonnet-4-5"], messages: [] }),
      ["chat", "completions"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(200);
    expect(seen).toEqual(["gpt-5", "claude-sonnet-4-5"]);
    await response.text();
    await flush();
    expect(settled[0]?.usage.model).toBe("claude-sonnet-4-5");
  });

  it("does not buffer a multipart body — an image edit still streams through", async () => {
    const form = new FormData();
    form.set("model", "gpt-image-2");
    form.set("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "p.png");
    let forwarded: unknown;
    const fetchImpl: typeof fetch = vi.fn(async (_input, init?: RequestInit) => {
      forwarded = init?.body;
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const { guard } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: "Bearer sk-sailor" },
        body: form,
      }),
      ["images", "edits"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(200);
    expect(forwarded).toBeInstanceOf(ReadableStream);
    // No model could be read from the stream, so nothing was priced or held —
    // but the balance was still checked (post-paid, not free).
    expect(guard.admit).not.toHaveBeenCalled();
    expect(guard.admitUnpriced).toHaveBeenCalledWith(
      expect.objectContaining({ path: "images/edits" }),
    );
  });

  it("charges a multipart image edit against the model read out of the upload", async () => {
    // The defect this closes: the model is a form field, so nothing was priced
    // and nothing settled — a key holding one cent ran image edits for free.
    const form = new FormData();
    form.set("model", "gpt-image-2");
    form.set("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "p.png");
    let forwarded: unknown;
    const fetchImpl: typeof fetch = vi.fn(async (_input, init?: RequestInit) => {
      forwarded = init?.body;
      // Drain the upload the way a real upstream would, so the prefix scan runs.
      await new Response(init?.body as ReadableStream).arrayBuffer();
      return new Response(JSON.stringify({ created: 1, data: [{ b64_json: "iVBORw0K" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const { guard, settled } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: "Bearer sk-sailor" },
        body: form,
      }),
      ["images", "edits"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(200);
    // The upload is still streamed, never buffered.
    expect(forwarded).toBeInstanceOf(ReadableStream);
    await response.text();
    await flush();
    expect(settled).toHaveLength(1);
    // Post-paid: nothing was held, so there is no admission to return.
    expect(settled[0]?.admission).toBeNull();
    expect(settled[0]?.billable).toBe(true);
    expect(settled[0]?.usage).toMatchObject({ model: "gpt-image-2", images: 1 });
  });

  it("settles an audio transcription on the seconds the upstream reported", async () => {
    const form = new FormData();
    form.set("model", "whisper-1");
    form.set("file", new Blob([new Uint8Array([9, 9])], { type: "audio/mpeg" }), "a.mp3");
    const fetchImpl: typeof fetch = vi.fn(async (_input, init?: RequestInit) => {
      await new Response(init?.body as ReadableStream).arrayBuffer();
      return new Response(JSON.stringify({ text: "hello there", duration: 12.5 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const { guard, settled } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer sk-sailor" },
        body: form,
      }),
      ["audio", "transcriptions"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(200);
    await response.text();
    await flush();
    expect(settled[0]?.usage).toMatchObject({ model: "whisper-1", seconds: 12.5 });
  });

  it("does not charge — and says so — when the model is past the scanned prefix", async () => {
    // A client that writes the file part first pushes `model` beyond the cap.
    // The request is relayed (the balance was checked) but nothing can price it,
    // so it settles at zero against an unknown model. `billing-edge` warns.
    const form = new FormData();
    form.set("image", new Blob([new Uint8Array(80 * 1024)], { type: "image/png" }), "big.png");
    form.set("model", "gpt-image-2");
    const fetchImpl: typeof fetch = vi.fn(async (_input, init?: RequestInit) => {
      await new Response(init?.body as ReadableStream).arrayBuffer();
      return new Response(JSON.stringify({ data: [{ b64_json: "x" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const { guard, settled } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: "Bearer sk-sailor" },
        body: form,
      }),
      ["images", "edits"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(200);
    await response.text();
    await flush();
    expect(settled).toHaveLength(1);
    expect(settled[0]?.usage.model).toBe("unknown");
  });

  it("records the refusal a key can see, and nothing for an unknown credential", async () => {
    const fetchImpl = vi.fn();
    const { guard, refused } = fakeGuard({
      admit: vi.fn(async () => ({
        ok: false as const,
        status: 402,
        code: "insufficient_balance" as const,
        message: "Insufficient balance. Top up to continue.",
      })),
    });
    const denied = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      { fetchImpl: fetchImpl as unknown as typeof fetch, resolveKey, upstreamToken: "t", guard },
    );
    expect(denied.status).toBe(402);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({
      code: "insufficient_balance",
      status: 402,
      path: "chat/completions",
      model: "gpt-5",
      identity,
    });
    // The customer can quote the same id back at us.
    expect(denied.headers.get("x-request-id")).toBe(refused[0]?.requestId);

    // An unrecognised credential has no tenant to log against.
    const anonymous = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        resolveKey: async () => null,
        upstreamToken: "t",
        guard,
      },
    );
    expect(anonymous.status).toBe(401);
    expect(refused).toHaveLength(1);
  });

  it("refuses an unpriceable multipart upload when the balance is empty", async () => {
    // Without this a zero-balance key could call images/edits forever: the model
    // is a form field, so nothing can be priced or held before the upload.
    const form = new FormData();
    form.set("model", "gpt-image-2");
    form.set("image", new Blob([new Uint8Array([1])], { type: "image/png" }), "p.png");
    const fetchImpl = vi.fn();
    const { guard } = fakeGuard({
      admitUnpriced: vi.fn(async () => ({
        ok: false as const,
        status: 402,
        code: "insufficient_balance" as const,
        message: "Insufficient balance. Top up to continue.",
      })),
    });
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: "Bearer sk-sailor" },
        body: form,
      }),
      ["images", "edits"],
      { fetchImpl: fetchImpl as unknown as typeof fetch, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(402);
    expect(fetchImpl).not.toHaveBeenCalled();
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("insufficient_balance");
  });

  it("does not gate a GET that carries no model — listing models needs no balance", async () => {
    const fetchImpl: typeof fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const { guard } = fakeGuard();
    const response = await proxyOpenAiCompatible(
      new Request("https://router.nebutra.com/v1/models", {
        headers: { Authorization: "Bearer sk-sailor" },
      }),
      ["models"],
      { fetchImpl, resolveKey, upstreamToken: "t", guard },
    );
    expect(response.status).toBe(200);
    expect(guard.admitUnpriced).not.toHaveBeenCalled();
  });

  it("refuses an oversized JSON body instead of relaying it unpriced", async () => {
    // A model that cannot be read is a request that cannot be priced. Before
    // this refusal existed, padding a prompt past the 4 MB cap bought an
    // unmetered relay for the price of a positive balance.
    const fetchImpl = vi.fn();
    const { guard } = fakeGuard();
    const huge = { model: "gpt-5", messages: [{ role: "user", content: "x".repeat(5_000_000) }] };
    const response = await proxyOpenAiCompatible(chatRequest(huge), ["chat", "completions"], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveKey,
      upstreamToken: "t",
      guard,
    });
    expect(response.status).toBe(413);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      "payload_too_large",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(guard.admit).not.toHaveBeenCalled();
    expect(guard.admitUnpriced).not.toHaveBeenCalled();
  });

  it("publishes the rate-limit headers, and Retry-After only on a 429", async () => {
    const fetchImpl: typeof fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ model: "gpt-5", usage: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const { guard } = fakeGuard();
    const ok = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      {
        fetchImpl,
        resolveKey,
        upstreamToken: "t",
        guard,
        rateLimit: async () => ({ allowed: true, limit: 10, remaining: 9, resetAt: 1_000 }),
      },
    );
    expect(ok.headers.get("x-ratelimit-limit")).toBe("10");
    expect(ok.headers.get("x-ratelimit-remaining")).toBe("9");
    expect(ok.headers.get("x-ratelimit-reset")).toBe("1");
    expect(ok.headers.get("retry-after")).toBeNull();

    const limited = await proxyOpenAiCompatible(
      chatRequest({ model: "gpt-5", messages: [] }),
      ["chat", "completions"],
      {
        fetchImpl,
        resolveKey,
        upstreamToken: "t",
        guard,
        rateLimit: async () => ({
          allowed: false,
          limit: 10,
          remaining: 0,
          resetAt: 1_000,
          retryAfterSeconds: 3,
        }),
      },
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("3");
    await expect(limited.json()).resolves.toMatchObject({
      error: { code: "rate_limit_exceeded" },
    });
  });

  it("answers 404 for a console path leaked onto the public /v1 rewrite", async () => {
    const fetchImpl = vi.fn();
    for (const path of [["wallet", "topup"], ["wallet"], ["keys"], ["keys", "abc"], ["chat"]]) {
      const response = await proxyOpenAiCompatible(
        new Request(`https://router.nebutra.com/v1/${path.join("/")}`, {
          method: "POST",
          headers: { Authorization: "Bearer sk-sailor" },
        }),
        path,
        { fetchImpl: fetchImpl as unknown as typeof fetch, resolveKey, upstreamToken: "t" },
      );
      expect(response.status, path.join("/")).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "unknown_endpoint" },
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("request body split", () => {
  it("parses a JSON body and reports its model chain", async () => {
    const read = await readRequestBody(
      chatRequest({ model: "a", models: ["b", "a", "c"], messages: [] }),
      4096,
    );
    expect(read.streaming).toBe(false);
    expect(modelCandidates(read.json)).toEqual(["a", "b", "c"]);
  });

  it("streams a JSON body over the cap instead of holding it, losing only models[]", async () => {
    const big = { model: "a", models: ["b"], filler: "x".repeat(2048) };
    const read = await readRequestBody(chatRequest(big), 512);
    expect(read.streaming).toBe(true);
    expect(read.json).toBeNull();
    // The replay stream still carries every byte the client sent.
    const text = await new Response(read.forward as ReadableStream).text();
    expect(JSON.parse(text)).toEqual(big);
  });
});

describe("the multipart model field", () => {
  const part = (name: string, value: string) =>
    `--B\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;

  it("reads the model out of a form-field prefix", () => {
    expect(scanMultipartModel(`${part("model", "gpt-image-2")}--B--\r\n`)).toBe("gpt-image-2");
  });

  it("reads it past other scalar fields", () => {
    const prefix = `${part("prompt", "a duck")}${part("model", "whisper-1")}--B\r\n`;
    expect(scanMultipartModel(prefix)).toBe("whisper-1");
  });

  it("refuses a value the prefix cut in half rather than pricing a truncated id", () => {
    expect(
      scanMultipartModel(`--B\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-ima`),
    ).toBeNull();
  });

  it("never mistakes a file part for the model field", () => {
    const file = `--B\r\nContent-Disposition: form-data; name="model"; filename="model.png"\r\nContent-Type: image/png\r\n\r\nPNGDATA\r\n`;
    expect(scanMultipartModel(file)).toBeNull();
  });

  it("reports nothing when there is no model field at all", () => {
    expect(scanMultipartModel(`${part("size", "1024x1024")}--B--\r\n`)).toBeNull();
  });
});

describe("billability", () => {
  const base = parseUsage("{}", "application/json");

  it("charges an embeddings call that has no completion tokens", () => {
    expect(isBillable(200, "embeddings", { ...base, promptTokens: 100 })).toBe(true);
  });

  it("refuses to charge a chat call that stopped with no reason and no output", () => {
    expect(isBillable(200, "chat/completions", base)).toBe(false);
  });

  it("refuses to charge a chat call whose finish reason is error", () => {
    expect(isBillable(200, "chat/completions", { ...base, finishReason: "error" })).toBe(false);
  });

  it("charges a legitimately empty answer that reported a stop reason", () => {
    expect(isBillable(200, "chat/completions", { ...base, finishReason: "stop" })).toBe(true);
  });

  it("never charges a non-2xx", () => {
    expect(isBillable(500, "chat/completions", { ...base, completionTokens: 99 })).toBe(false);
  });
});

describe("usage parsing for the money path", () => {
  it("reads OpenAI cached prompt tokens out of prompt_tokens_details", () => {
    const parsed = parseUsage(
      JSON.stringify({
        model: "gpt-5",
        choices: [{ finish_reason: "stop" }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 10,
          prompt_tokens_details: { cached_tokens: 800 },
        },
      }),
      "application/json",
    );
    expect(parsed).toMatchObject({
      promptTokens: 1000,
      cachedPromptTokens: 800,
      finishReason: "stop",
      errored: false,
    });
  });

  it("folds Anthropic cache reads into the prompt count and reads the stop reason", () => {
    const frames = [
      `data: ${JSON.stringify({
        type: "message_start",
        message: {
          model: "claude-sonnet-4-5",
          usage: {
            input_tokens: 20,
            cache_read_input_tokens: 100,
            cache_creation_input_tokens: 5,
          },
        },
      })}`,
      `data: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 9 } })}`,
    ].join("\n\n");
    expect(parseUsage(frames, "text/event-stream")).toMatchObject({
      model: "claude-sonnet-4-5",
      promptTokens: 120,
      cachedPromptTokens: 100,
      cacheWriteTokens: 5,
      completionTokens: 9,
      finishReason: "end_turn",
    });
  });

  it("counts the images an image endpoint returned", () => {
    const parsed = parseUsage(
      JSON.stringify({ created: 1, data: [{ b64_json: "a" }, { url: "https://x/y.png" }] }),
      "application/json",
    );
    expect(parsed.images).toBe(2);
  });

  it("does not read a models listing as two images", () => {
    const parsed = parseUsage(
      JSON.stringify({ object: "list", data: [{ id: "gpt-5" }, { id: "gpt-4o" }] }),
      "application/json",
    );
    expect(parsed.images).toBe(0);
  });

  it("reads transcription seconds from duration and from usage alike", () => {
    expect(
      parseUsage(JSON.stringify({ text: "hi", duration: 8.25 }), "application/json").seconds,
    ).toBe(8.25);
    expect(
      parseUsage(
        JSON.stringify({ text: "hi", usage: { type: "duration", seconds: 30 } }),
        "application/json",
      ).seconds,
    ).toBe(30);
  });

  it("flags an SSE error event", () => {
    const frames = `event: error\ndata: ${JSON.stringify({ type: "error", error: { message: "overloaded" } })}\n\n`;
    expect(parseUsage(frames, "text/event-stream").errored).toBe(true);
  });
});
