import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nebutra/audit", () => ({
  auditLogger: () => ({ log: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("@nebutra/db", () => ({ getSystemDb: vi.fn(() => ({})) }));
// A meaningfully opaque fake — real encryption's whole point is that the
// ciphertext does not contain the plaintext, so the fake round-trips through
// an id rather than embedding `data` directly, or the "never in the clear"
// assertion below would only be testing the fake, not `addSource`.
const vault = vi.hoisted(() => ({ box: new Map<string, unknown>(), nextId: 0 }));
vi.mock("@nebutra/vault", () => ({
  encryptJSON: vi.fn(async (data: unknown) => {
    const id = `enc_${vault.nextId++}`;
    vault.box.set(id, data);
    return { __fakeEncrypted: true, id };
  }),
  decryptJSON: vi.fn(async (secret: { id: string }) => vault.box.get(secret.id)),
}));

// ADR 2026-09-30 "Event-driven execution": capability.ts no longer probes
// inline — it emits supply/* events and lets the gateway's Inngest fan-out do
// the actual upstream calls. Mocked here so every test below can assert on
// *which* events were emitted without a real gateway relay.
const emitSupplyEvent = vi.hoisted(() => vi.fn(async () => ({ ok: true, ids: ["evt_1"] })));
vi.mock("./events", () => ({ emitSupplyEvent }));

const repo = vi.hoisted(() => ({
  upsertSource: vi.fn(async (input: Record<string, unknown>) => ({
    id: "supsrc_1",
    key: input.key,
    kind: input.kind,
    protocol: input.protocol ?? "UNKNOWN",
    label: input.label,
    baseUrl: input.baseUrl,
    credentialRef: input.credentialRef ?? null,
    enabled: input.enabled ?? true,
    visibility: input.visibility ?? "PUBLIC",
    lastDiscoveredAt: null,
    lastDiscoverySummary: null,
  })),
  applyDiscovery: vi.fn(async (_sourceId: string, models: Array<{ id: string }>) => ({
    added: models.map((m) => m.id),
    reappeared: [],
    vanished: [],
    unchanged: [],
  })),
  getSourceByKey: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
  listSources: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
  listCapabilities: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
  listDueForActiveProbe: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
  listSuspendedDueForRetry: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
  findBySourceKeyAndUpstreamModel: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
  recordProbe: vi.fn(async () => ({
    fromState: "AVAILABLE",
    toState: "AVAILABLE",
    stateReason: null,
    transitioned: false,
  })),
}));
vi.mock("@nebutra/repositories", () => ({
  RouterSupplyRepository: class {
    upsertSource = repo.upsertSource;
    applyDiscovery = repo.applyDiscovery;
    getSourceByKey = repo.getSourceByKey;
    listSources = repo.listSources;
    listCapabilities = repo.listCapabilities;
    listDueForActiveProbe = repo.listDueForActiveProbe;
    listSuspendedDueForRetry = repo.listSuspendedDueForRetry;
    findBySourceKeyAndUpstreamModel = repo.findBySourceKeyAndUpstreamModel;
    recordProbe = repo.recordProbe;
  },
}));

const {
  addSource,
  probeOneModel,
  probeSourceNow,
  recordPassiveSignal,
  runActiveProbes,
  runSuspendedRetry,
  triggerDiscoveryForAllSources,
} = await import("./capability");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function caller() {
  return { userId: "staff_1", role: "platform_operator" } as never;
}

function actionRequest() {
  return new Request("https://router.internal/api/admin/v1/supply/actions/source.add", {
    method: "POST",
  });
}

function resetAllMocks() {
  repo.upsertSource.mockClear();
  repo.applyDiscovery.mockClear();
  repo.getSourceByKey.mockReset().mockResolvedValue(null);
  repo.listSources.mockReset().mockResolvedValue([]);
  repo.listCapabilities.mockReset().mockResolvedValue([]);
  repo.listDueForActiveProbe.mockReset().mockResolvedValue([]);
  repo.listSuspendedDueForRetry.mockReset().mockResolvedValue([]);
  repo.findBySourceKeyAndUpstreamModel.mockReset().mockResolvedValue(null);
  repo.recordProbe.mockClear();
  emitSupplyEvent.mockClear();
}

describe("addSource — visibility (INTERNAL sources, team-use-only onboarding)", () => {
  afterEach(resetAllMocks);

  it("defaults visibility to PUBLIC when the caller does not specify one", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [] }));
    await addSource(
      {
        key: "some-relay",
        label: "Some relay",
        baseUrl: "https://relay.example.com",
        kind: "OPENAI_COMPATIBLE",
        apiKey: "sk-test",
      },
      caller(),
      actionRequest(),
      fetchImpl as unknown as typeof fetch,
    );
    expect(repo.upsertSource).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "PUBLIC" }),
    );
  });

  it(
    "onboards Command Code as INTERNAL: visibility is passed through to the repository, " +
      "discovery keeps its per-model metadata, and the base URL's own /v1 path is respected",
    async () => {
      const fetchImpl = vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === "https://api.commandcode.ai/provider/v1/models") {
          return jsonResponse({
            data: [
              {
                id: "gpt-5-codex",
                name: "GPT-5 Codex",
                context_length: 400_000,
                supported_endpoints: ["/chat/completions"],
              },
            ],
          });
        }
        throw new Error(`unexpected fetch ${url}`);
      });

      const result = await addSource(
        {
          key: "commandcode",
          label: "Command Code (internal, team use only)",
          baseUrl: "https://api.commandcode.ai/provider/v1",
          kind: "OPENAI_COMPATIBLE",
          apiKey: "sk-command-code-goat-REPLACE_ME",
          visibility: "INTERNAL",
        },
        caller(),
        actionRequest(),
        fetchImpl as unknown as typeof fetch,
      );

      expect(repo.upsertSource).toHaveBeenCalledWith(
        expect.objectContaining({ key: "commandcode", visibility: "INTERNAL" }),
      );
      // A secret was given, so it must never be written to the row in the clear.
      const [[upsertInput]] = repo.upsertSource.mock.calls as [[Record<string, unknown>]];
      expect(upsertInput.credentialRef).not.toContain("sk-command-code-goat-REPLACE_ME");

      expect(repo.applyDiscovery).toHaveBeenCalledWith(
        "supsrc_1",
        expect.arrayContaining([
          expect.objectContaining({
            id: "gpt-5-codex",
            capabilities: {
              name: "GPT-5 Codex",
              context_length: 400_000,
              supported_endpoints: ["/chat/completions"],
            },
          }),
        ]),
      );
      expect(result.discovered).toBe(1);
      expect(result.summary).toContain("discovered 1 model(s)");
    },
  );

  it(
    "emits supply/model.discovered for freshly discovered models and supply/source.changed " +
      "regardless — never probes the model itself inline (ADR 2026-09-30 'Event-driven execution')",
    async () => {
      const fetchImpl = vi.fn(async (_input: string | URL | Request) =>
        jsonResponse({ data: [{ id: "gpt-5-codex" }] }),
      );

      await addSource(
        {
          key: "commandcode",
          label: "Command Code",
          baseUrl: "https://api.commandcode.ai/provider/v1",
          kind: "OPENAI_COMPATIBLE",
          apiKey: "sk-test",
        },
        caller(),
        actionRequest(),
        fetchImpl as unknown as typeof fetch,
      );

      // Every call made is a /v1/models listing (protocol detection, then
      // discovery) — never a per-model probe call (that would hit some other
      // path, e.g. /chat/completions).
      for (const call of fetchImpl.mock.calls) {
        expect(String(call[0])).toBe("https://api.commandcode.ai/provider/v1/models");
      }

      expect(emitSupplyEvent).toHaveBeenCalledWith("supply/model.discovered", {
        sourceKey: "commandcode",
        upstreamModels: ["gpt-5-codex"],
      });
      expect(emitSupplyEvent).toHaveBeenCalledWith("supply/source.changed", {
        sourceKey: "commandcode",
        reason: "added",
      });
    },
  );

  it("still emits supply/source.changed even when discovery finds nothing fresh", async () => {
    repo.applyDiscovery.mockResolvedValueOnce({
      added: [],
      reappeared: [],
      vanished: [],
      unchanged: [],
    });
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [] }));

    await addSource(
      {
        key: "empty-source",
        label: "Empty",
        baseUrl: "https://relay.example.com",
        kind: "OPENAI_COMPATIBLE",
        apiKey: "sk-test",
      },
      caller(),
      actionRequest(),
      fetchImpl as unknown as typeof fetch,
    );

    expect(emitSupplyEvent).not.toHaveBeenCalledWith("supply/model.discovered", expect.anything());
    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/source.changed", {
      sourceKey: "empty-source",
      reason: "added",
    });
  });
});

describe("probeSourceNow — admin 'probe now' queues instead of probing inline", () => {
  afterEach(resetAllMocks);

  it("emits supply/probe.requested and returns status: queued, with no upstream fetch", async () => {
    const result = await probeSourceNow("cliproxyapi", caller(), actionRequest());

    expect(emitSupplyEvent).toHaveBeenCalledWith(
      "supply/probe.requested",
      expect.objectContaining({ sourceKey: "cliproxyapi", runId: expect.any(String) }),
    );
    expect(result.status).toBe("queued");
    expect(result.runId).toEqual(expect.any(String));
  });

  it("reports status: failed when the event could not be sent", async () => {
    emitSupplyEvent.mockResolvedValueOnce({ ok: false, ids: [] });
    const result = await probeSourceNow("cliproxyapi", caller(), actionRequest());
    expect(result.status).toBe("failed");
  });
});

describe("triggerDiscoveryForAllSources — bounded by source count, never by model count", () => {
  afterEach(resetAllMocks);

  it("emits one supply/source.changed per enabled source and makes zero upstream calls", async () => {
    repo.listSources.mockResolvedValue([
      { key: "cliproxyapi", enabled: true },
      { key: "newapi-channel-cliproxyapi", enabled: true },
      { key: "disabled-source", enabled: false },
    ]);

    const result = await triggerDiscoveryForAllSources();

    expect(result.sources).toEqual(["cliproxyapi", "newapi-channel-cliproxyapi"]);
    expect(emitSupplyEvent).toHaveBeenCalledTimes(2);
    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/source.changed", {
      sourceKey: "cliproxyapi",
      reason: "scheduled",
    });
  });
});

describe("probeOneModel — the probe(source, model) primitive (exactly one upstream call)", () => {
  afterEach(resetAllMocks);

  function sourceRow() {
    return {
      id: "supsrc_cc",
      key: "commandcode",
      kind: "OPENAI_COMPATIBLE",
      protocol: "OPENAI_COMPATIBLE",
      label: "Command Code",
      baseUrl: "https://api.commandcode.ai/provider/v1",
      credentialRef: null,
      enabled: true,
      visibility: "INTERNAL",
      lastDiscoveredAt: null,
      lastDiscoverySummary: null,
    };
  }

  function capabilityRow(overrides: Record<string, unknown>) {
    return {
      id: "supmod_1",
      sourceId: "supsrc_cc",
      sourceKey: "commandcode",
      upstreamModel: "claude-haiku-4-5-20251001",
      modality: "TEXT",
      publicModel: "claude-haiku-4-5-20251001",
      state: "AVAILABLE",
      stateReason: null,
      pinned: false,
      banned: false,
      lastProbeAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      nextProbeAt: null,
      vanishedAt: null,
      capabilities: null,
      ...overrides,
    };
  }

  it("routes the probe for a /messages-only model through /messages, from the stored capability row, with exactly one fetch call", async () => {
    repo.listSources.mockResolvedValue([sourceRow()]);
    repo.findBySourceKeyAndUpstreamModel.mockResolvedValue(
      capabilityRow({ capabilities: { supported_endpoints: ["/messages"] } }),
    );
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "msg_1" }));

    const result = await probeOneModel(
      "commandcode",
      "claude-haiku-4-5-20251001",
      fetchImpl as unknown as typeof fetch,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.commandcode.ai/provider/v1/messages");
    expect(result.outcome).toBe("success");
    expect(repo.recordProbe).toHaveBeenCalledWith(
      expect.objectContaining({ sourceModelId: "supmod_1", outcome: "success" }),
      expect.any(Function),
    );
  });

  it(
    "a wrong-endpoint refusal (probe-shape bug, not the model failing) is neutral: reported as " +
      "'neutral', and recordProbe is never called — it can never suspend the model",
    async () => {
      repo.listSources.mockResolvedValue([sourceRow()]);
      repo.findBySourceKeyAndUpstreamModel.mockResolvedValue(capabilityRow({ capabilities: null }));
      const fetchImpl = vi.fn(async () =>
        jsonResponse(
          {
            error: {
              message:
                'Model "claude-haiku-4-5-20251001" must be called via /provider/v1/messages (Anthropic Messages shape).',
              code: "unsupported_model",
            },
          },
          400,
        ),
      );

      const result = await probeOneModel(
        "commandcode",
        "claude-haiku-4-5-20251001",
        fetchImpl as unknown as typeof fetch,
      );

      expect(result.outcome).toBe("neutral");
      expect(repo.recordProbe).not.toHaveBeenCalled();
    },
  );

  it("returns a neutral 'not_found' result and makes no upstream call for an unknown (source, model) pair", async () => {
    repo.findBySourceKeyAndUpstreamModel.mockResolvedValue(null);
    const fetchImpl = vi.fn();

    const result = await probeOneModel(
      "commandcode",
      "nonexistent",
      fetchImpl as unknown as typeof fetch,
    );

    expect(result.outcome).toBe("neutral");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("runActiveProbes / runSuspendedRetry — backstops are bounded: list + group + emit, never probe inline", () => {
  afterEach(resetAllMocks);

  it("runActiveProbes groups due rows by source and emits one supply/probe.requested per source, with no upstream call at all", async () => {
    repo.listDueForActiveProbe.mockResolvedValue([
      { sourceKey: "cliproxyapi", upstreamModel: "a" },
      { sourceKey: "cliproxyapi", upstreamModel: "b" },
      { sourceKey: "other-source", upstreamModel: "c" },
    ]);

    const result = await runActiveProbes(50);

    expect(result.groups).toBe(2);
    expect(result.models).toBe(3);
    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/probe.requested", {
      sourceKey: "cliproxyapi",
      upstreamModels: ["a", "b"],
      runId: expect.any(String),
    });
    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/probe.requested", {
      sourceKey: "other-source",
      upstreamModels: ["c"],
      runId: expect.any(String),
    });
  });

  it("runSuspendedRetry does the same grouping over the suspended-due list", async () => {
    repo.listSuspendedDueForRetry.mockResolvedValue([
      { sourceKey: "flaky-source", upstreamModel: "x" },
    ]);

    const result = await runSuspendedRetry(100);

    expect(result.groups).toBe(1);
    expect(emitSupplyEvent).toHaveBeenCalledWith(
      "supply/probe.requested",
      expect.objectContaining({ sourceKey: "flaky-source", upstreamModels: ["x"] }),
    );
  });

  it("an empty due list emits nothing and reports zero groups/models", async () => {
    const result = await runActiveProbes(50);
    expect(result).toEqual({ groups: 0, models: 0, runId: expect.any(String) });
    expect(emitSupplyEvent).not.toHaveBeenCalled();
  });
});

describe("recordPassiveSignal — error_spike / rate_limited trigger a targeted re-probe event", () => {
  afterEach(resetAllMocks);

  it("emits supply/model.signal{kind: rate_limited} for a neutral rate-limited failure, without touching the state machine", async () => {
    await recordPassiveSignal({
      sourceKey: "cliproxyapi",
      upstreamModel: "gpt-image-2.5",
      ok: false,
      reason: "rate_limited",
    });

    expect(repo.recordProbe).not.toHaveBeenCalled();
    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/model.signal", {
      sourceKey: "cliproxyapi",
      upstreamModel: "gpt-image-2.5",
      kind: "rate_limited",
      reason: "rate_limited",
    });
  });

  it("emits supply/model.signal{kind: error_spike} when a failure transitions the model to DEGRADED/SUSPENDED", async () => {
    repo.findBySourceKeyAndUpstreamModel.mockResolvedValue({ id: "supmod_1" });
    repo.recordProbe.mockResolvedValue({
      fromState: "AVAILABLE",
      toState: "DEGRADED",
      stateReason: null,
      transitioned: true,
    });

    await recordPassiveSignal({
      sourceKey: "cliproxyapi",
      upstreamModel: "gpt-image-2.5",
      ok: false,
      reason: "auth_not_found",
    });

    expect(emitSupplyEvent).toHaveBeenCalledWith("supply/model.signal", {
      sourceKey: "cliproxyapi",
      upstreamModel: "gpt-image-2.5",
      kind: "error_spike",
      reason: "auth_not_found",
    });
  });

  it("emits nothing extra for a plain success", async () => {
    repo.findBySourceKeyAndUpstreamModel.mockResolvedValue({ id: "supmod_1" });
    repo.recordProbe.mockResolvedValue({
      fromState: "AVAILABLE",
      toState: "AVAILABLE",
      stateReason: null,
      transitioned: false,
    });

    await recordPassiveSignal({
      sourceKey: "cliproxyapi",
      upstreamModel: "gpt-image-2.5",
      ok: true,
    });

    expect(emitSupplyEvent).not.toHaveBeenCalled();
  });
});

describe("maybeEmitBootstrap — bootstrap when the registry has never been seeded", () => {
  afterEach(resetAllMocks);

  // `maybeEmitBootstrap` remembers "already checked" at module scope (so a
  // Router process only ever checks once) — re-importing the module after
  // `vi.resetModules()` gives each test its own fresh flag, the same way a
  // fresh process would see it.
  async function freshCapabilityModule() {
    vi.resetModules();
    return import("./capability");
  }

  it("emits supply/bootstrap naming every never-discovered built-in source when the registry starts empty", async () => {
    repo.listSources
      .mockResolvedValueOnce([]) // before ensureDefaultSources
      .mockResolvedValueOnce([
        { key: "cliproxyapi", lastDiscoveredAt: null },
        { key: "newapi-channel-cliproxyapi", lastDiscoveredAt: null },
      ]); // after

    const { maybeEmitBootstrap } = await freshCapabilityModule();
    await maybeEmitBootstrap();

    expect(emitSupplyEvent).toHaveBeenCalledWith(
      "supply/bootstrap",
      expect.objectContaining({
        sourceKeys: ["cliproxyapi", "newapi-channel-cliproxyapi"],
      }),
    );
  });

  it("does nothing when every source has already been discovered at least once", async () => {
    repo.listSources
      .mockResolvedValueOnce([{ key: "cliproxyapi", lastDiscoveredAt: new Date() }])
      .mockResolvedValueOnce([{ key: "cliproxyapi", lastDiscoveredAt: new Date() }]);

    const { maybeEmitBootstrap } = await freshCapabilityModule();
    await maybeEmitBootstrap();

    expect(emitSupplyEvent).not.toHaveBeenCalledWith("supply/bootstrap", expect.anything());
  });

  it("checks at most once per process — a second call is a no-op even if the registry would now qualify", async () => {
    repo.listSources.mockResolvedValue([{ key: "cliproxyapi", lastDiscoveredAt: new Date() }]);

    const { maybeEmitBootstrap } = await freshCapabilityModule();
    await maybeEmitBootstrap();
    emitSupplyEvent.mockClear();
    repo.listSources.mockResolvedValue([]); // would now look unseeded

    await maybeEmitBootstrap();

    expect(emitSupplyEvent).not.toHaveBeenCalled();
  });
});
