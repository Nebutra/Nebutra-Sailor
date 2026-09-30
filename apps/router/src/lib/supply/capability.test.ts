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
  listSources: vi.fn(async () => []),
  listCapabilities: vi.fn(async () => []),
}));
vi.mock("@nebutra/repositories", () => ({
  RouterSupplyRepository: class {
    upsertSource = repo.upsertSource;
    applyDiscovery = repo.applyDiscovery;
    listSources = repo.listSources;
    listCapabilities = repo.listCapabilities;
  },
}));

const { addSource } = await import("./capability");

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

describe("addSource — visibility (INTERNAL sources, team-use-only onboarding)", () => {
  afterEach(() => {
    repo.upsertSource.mockClear();
  });

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
});
