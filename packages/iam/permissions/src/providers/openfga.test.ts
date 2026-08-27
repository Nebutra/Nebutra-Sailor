import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenFGAProvider,
  type OpenFGACheckRequest,
  type OpenFGAListObjectsRequest,
  type OpenFGAWriteRequest,
} from "./openfga";

function mockJsonFetch(body: unknown = { allowed: true }, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OpenFGAProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("checks permissions against the store-scoped REST endpoint with bearer auth", async () => {
    const fetchMock = mockJsonFetch({ allowed: true });
    const provider = createOpenFGAProvider({
      apiUrl: "https://fga.example.com/",
      authToken: "test-token",
      storeId: "store_123",
    });

    await expect(provider.check("user:alice", "read", "document:doc_1")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith("https://fga.example.com/stores/store_123/check", {
      body: JSON.stringify({
        tuple_key: {
          object: "document:doc_1",
          relation: "read",
          user: "user:alice",
        },
      } satisfies OpenFGACheckRequest),
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("writes and deletes tuples through the store-scoped write endpoint", async () => {
    const fetchMock = mockJsonFetch({});
    const provider = createOpenFGAProvider({
      apiUrl: "https://fga.example.com",
      storeId: "store_123",
    });

    await provider.write([{ object: "team:acme", relation: "member", user: "user:alice" }]);
    await provider.delete([{ object: "team:acme", relation: "member", user: "user:alice" }]);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://fga.example.com/stores/store_123/write", {
      body: JSON.stringify({
        writes: {
          tuple_keys: [{ object: "team:acme", relation: "member", user: "user:alice" }],
        },
      } satisfies OpenFGAWriteRequest),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://fga.example.com/stores/store_123/write", {
      body: JSON.stringify({
        deletes: {
          tuple_keys: [{ object: "team:acme", relation: "member", user: "user:alice" }],
        },
      } satisfies OpenFGAWriteRequest),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("lists objects through the store-scoped list-objects endpoint", async () => {
    const fetchMock = mockJsonFetch({ objects: ["document:doc_1"] });
    const provider = createOpenFGAProvider({
      apiUrl: "https://fga.example.com",
      storeId: "store_123",
    });

    await expect(provider.listObjects("user:alice", "read", "document")).resolves.toEqual([
      "document:doc_1",
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://fga.example.com/stores/store_123/list-objects",
      {
        body: JSON.stringify({
          relation: "read",
          type: "document",
          user: "user:alice",
        } satisfies OpenFGAListObjectsRequest),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
  });

  it("fails closed when the store id is missing or the OpenFGA request fails", async () => {
    const fetchMock = mockJsonFetch({ allowed: true });
    const providerWithoutStore = createOpenFGAProvider({
      apiUrl: "https://fga.example.com",
    });

    await expect(providerWithoutStore.check("user:alice", "read", "document:doc_1")).resolves.toBe(
      false,
    );
    expect(fetchMock).not.toHaveBeenCalled();

    const failingFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", failingFetch);
    const provider = createOpenFGAProvider({
      apiUrl: "https://fga.example.com",
      storeId: "store_123",
    });

    await expect(provider.check("user:alice", "read", "document:doc_1")).resolves.toBe(false);
    await expect(provider.listObjects("user:alice", "read", "document")).resolves.toEqual([]);
  });
});
