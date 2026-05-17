/**
 * Provider-seam tests for the code-index `getX()` singleton.
 *
 * Mirrors the house factory contract (createX / getX / setX / closeX) used by
 * @nebutra/search: a never-configured `getCodeIndex()` MUST fail closed by
 * throwing {@link CodeIndexNotConfiguredError} (there are NO bundled adapters —
 * Embedder/VectorStore are host-injected), `setCodeIndex` is the test seam, and
 * `closeCodeIndex` resets the singleton back to the fail-closed default.
 */

import { afterEach, describe, expect, it } from "vitest";
import { type CodeIndexEngine, createIndexEngine } from "./index-engine";
import {
  CodeIndexNotConfiguredError,
  type CollectionKey,
  type Embedder,
  type FileSource,
  type IndexCacheStore,
  type VectorStore,
} from "./interfaces";
import { closeCodeIndex, createCodeIndex, getCodeIndex, setCodeIndex } from "./provider";

// ─── Minimal hand-written fakes (no mocking libraries) ──────────────────────

function fakeEmbedder(): Embedder {
  return {
    provider: "test-provider",
    modelId: "test-model",
    dimension: 3,
    embed: async (texts) => texts.map(() => [0.1, 0.2, 0.3]),
  };
}

function fakeStore(): VectorStore {
  return {
    ensureCollection: async () => {},
    recreate: async () => {},
    upsert: async () => {},
    deleteByFilePath: async () => {},
    deleteByIds: async () => {},
    search: async () => [],
    getMetadata: async () => undefined,
    setMetadata: async () => {},
  };
}

function fakeFiles(): FileSource {
  return { list: async () => [], read: async () => "" };
}

function fakeCache(): IndexCacheStore {
  const m: Record<string, Record<string, string>> = {};
  return {
    load: async (k) => m[k] ?? {},
    save: async (k, map) => {
      m[k] = map;
    },
  };
}

const KEY = "ci_deadbeef" as CollectionKey;

function buildEngine(): CodeIndexEngine {
  return createIndexEngine({
    key: KEY,
    embedder: fakeEmbedder(),
    store: fakeStore(),
    files: fakeFiles(),
    cache: fakeCache(),
    chunk: () => [],
    languageOf: () => "ts",
  });
}

describe("code-index provider seam", () => {
  afterEach(async () => {
    await closeCodeIndex();
  });

  it("getCodeIndex() throws CodeIndexNotConfiguredError before configure", () => {
    expect(() => getCodeIndex()).toThrow(CodeIndexNotConfiguredError);
  });

  it("getCodeIndex() error explains adapters are host-injected (not bundled)", () => {
    try {
      getCodeIndex();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CodeIndexNotConfiguredError);
      expect((err as CodeIndexNotConfiguredError).code).toBe("CODE_INDEX_NOT_CONFIGURED");
    }
  });

  it("setCodeIndex() installs an engine that getCodeIndex() then returns", () => {
    const engine = buildEngine();
    setCodeIndex(engine);
    expect(getCodeIndex()).toBe(engine);
  });

  it("createCodeIndex() builds AND installs the singleton", () => {
    const engine = createCodeIndex({
      key: KEY,
      embedder: fakeEmbedder(),
      store: fakeStore(),
      files: fakeFiles(),
      cache: fakeCache(),
      chunk: () => [],
      languageOf: () => "ts",
    });
    expect(getCodeIndex()).toBe(engine);
  });

  it("createCodeIndex() returns an engine exposing indexAll + search", () => {
    const engine = createCodeIndex({
      key: KEY,
      embedder: fakeEmbedder(),
      store: fakeStore(),
      files: fakeFiles(),
      cache: fakeCache(),
      chunk: () => [],
      languageOf: () => "ts",
    });
    expect(typeof engine.indexAll).toBe("function");
    expect(typeof engine.search).toBe("function");
  });

  it("closeCodeIndex() resets back to the fail-closed default", async () => {
    setCodeIndex(buildEngine());
    expect(() => getCodeIndex()).not.toThrow();
    await closeCodeIndex();
    expect(() => getCodeIndex()).toThrow(CodeIndexNotConfiguredError);
  });

  it("closeCodeIndex() is idempotent (safe to call when never configured)", async () => {
    await expect(closeCodeIndex()).resolves.toBeUndefined();
    await expect(closeCodeIndex()).resolves.toBeUndefined();
  });

  it("setCodeIndex() replaces a previously installed engine", () => {
    const a = buildEngine();
    const b = buildEngine();
    setCodeIndex(a);
    setCodeIndex(b);
    expect(getCodeIndex()).toBe(b);
    expect(getCodeIndex()).not.toBe(a);
  });
});
