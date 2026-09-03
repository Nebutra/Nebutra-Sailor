import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InvalidResourceKeyError,
  isR2Configured,
  momentObjectKey,
  orbitAssetKey,
  publicAssetUrl,
  RESOURCE_ROOT,
  ResourceStoreUnavailableError,
  skuSampleKey,
  skuSampleSrc,
  wardrobeSampleKey,
  wardrobeSampleSrc,
} from "./resources";

describe("resource keys", () => {
  it("places public orbit stills under the kuanlan assets prefix", () => {
    expect(orbitAssetKey("01.jpg")).toBe("kuanlan/orbit/01.jpg");
    expect(orbitAssetKey("12.jpg")).toBe(`${RESOURCE_ROOT}/orbit/12.jpg`);
  });

  it("places wardrobe stills under the public wardrobe prefix as JPEG", () => {
    expect(wardrobeSampleKey("blazer")).toBe("kuanlan/wardrobe/blazer.jpg");
    expect(wardrobeSampleSrc("knit")).toBe(
      "https://cdn.nebutra.com/kuanlan/wardrobe/knit.jpg?v=incamera",
    );
    expect(() => wardrobeSampleSrc("../face")).toThrow(InvalidResourceKeyError);
  });

  it("places 领证照 samples under the public skus prefix", () => {
    expect(skuSampleKey("cn-2in-white")).toBe("kuanlan/skus/cn-2in-white.jpg");
    expect(skuSampleSrc("visa-us")).toBe("https://cdn.nebutra.com/kuanlan/skus/visa-us.jpg");
    expect(skuSampleSrc("id-white")).toBe("https://cdn.nebutra.com/kuanlan/skus/cn-1in-white.jpg");
    expect(skuSampleSrc("id-blue")).toBe("https://cdn.nebutra.com/kuanlan/skus/cn-2in-blue.jpg");
    expect(skuSampleSrc("linkedin-studio")).toBe(
      "https://cdn.nebutra.com/kuanlan/skus/linkedin-studio.jpg?v=incamera",
    );
    expect(() => skuSampleSrc("../secret")).toThrow(InvalidResourceKeyError);
  });

  it("places 领证照 moments under the private uploads prefix", () => {
    expect(momentObjectKey({ kind: "id-photo", userId: "user_1", id: "moment-1" })).toBe(
      "kuanlan/moments/id-photo/user_1/moment-1.png",
    );
    expect(
      momentObjectKey({ kind: "id-photo", userId: "user_1", id: "moment-1", part: "source" }),
    ).toBe("kuanlan/moments/id-photo/user_1/moment-1.source");
    expect(() => momentObjectKey({ kind: "id-photo", userId: "../x", id: "moment-1" })).toThrow(
      InvalidResourceKeyError,
    );
  });

  it("refuses path traversal and unmarked names", () => {
    expect(() => orbitAssetKey("../secret.jpg")).toThrow(InvalidResourceKeyError);
    expect(() => orbitAssetKey("01.png")).toThrow(InvalidResourceKeyError);
    expect(() => momentObjectKey({ kind: "id-photo", userId: "user_1", id: "../x" })).toThrow(
      InvalidResourceKeyError,
    );
  });

  it("joins the public CDN base without a double slash", () => {
    expect(publicAssetUrl("kuanlan/orbit/08.jpg", "https://cdn.nebutra.com/")).toBe(
      "https://cdn.nebutra.com/kuanlan/orbit/08.jpg",
    );
  });

  it("refuses to publish a key outside the kuanlan prefix", () => {
    expect(() => publicAssetUrl("other/orbit/01.jpg", "https://cdn.nebutra.com")).toThrow(
      InvalidResourceKeyError,
    );
  });
});

describe("R2 configuration", () => {
  const keys = ["CLOUDFLARE_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("fails closed when S3 credentials are missing", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    expect(isR2Configured()).toBe(false);

    const { persistIdPhotoMoment } = await import("./resources.server");
    await expect(
      persistIdPhotoMoment({
        userId: "user_1",
        skuId: "cn-1in-white",
        print: Buffer.from("png"),
      }),
    ).rejects.toBeInstanceOf(ResourceStoreUnavailableError);
  });

  it("writes the print, and only the print, to the uploads bucket", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "account";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";

    const upload = vi.fn(async (key: string, _body: unknown, _options?: unknown) => ({
      key,
      bucket: "nebutra-uploads",
      url: `https://signed.example/${key}`,
      size: 3,
    }));

    const { persistIdPhotoMoment } = await import("./resources.server");
    const stored = await persistIdPhotoMoment(
      {
        id: "shot-1",
        userId: "user_1",
        skuId: "cn-1in-white",
        print: Buffer.from("png"),
      },
      upload,
    );

    expect(stored).toEqual({
      id: "shot-1",
      key: "kuanlan/moments/id-photo/user_1/shot-1.png",
      url: "https://signed.example/kuanlan/moments/id-photo/user_1/shot-1.png",
    });
    // One object, not two. The uploaded portrait is never written.
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[0]).toBe("kuanlan/moments/id-photo/user_1/shot-1.png");
    expect(upload.mock.calls[0]?.[2]).toMatchObject({
      bucket: "uploads",
      contentType: "image/png",
      metadata: { skuId: "cn-1in-white", app: "kuanlan", userId: "user_1" },
    });
    // Nothing follows it: no `.source`, and therefore no face photograph kept
    // for a reader that never existed.
    expect(upload.mock.calls[1]).toBeUndefined();
  });

  function configureR2() {
    process.env.CLOUDFLARE_ACCOUNT_ID = "account";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
  }

  const prefix = "kuanlan/moments/id-photo/user_1/";
  const entry = (name: string, iso?: string) => ({
    key: `${prefix}${name}`,
    size: 1,
    ...(iso ? { lastModified: new Date(iso) } : {}),
  });
  const sign = async (key: string) => `https://signed.example/${key}`;

  it("deletes the print and the original that used to sit beside it", async () => {
    configureR2();

    const dropped: string[] = [];
    const { deleteIdPhotoMoment } = await import("./resources.server");
    await deleteIdPhotoMoment("user_1", "shot-1", {
      remove: async (key) => {
        dropped.push(key);
      },
    });

    expect(dropped.sort()).toEqual([
      "kuanlan/moments/id-photo/user_1/shot-1.png",
      "kuanlan/moments/id-photo/user_1/shot-1.source",
    ]);
  });

  it("cannot be pointed at another person's shelf", async () => {
    configureR2();

    const { deleteIdPhotoMoment } = await import("./resources.server");
    await expect(
      deleteIdPhotoMoment("user_1", "../user_2/shot-1", { remove: async () => {} }),
    ).rejects.toMatchObject({ name: "InvalidResourceKeyError" });
  });

  it("refuses to delete when the store is unconfigured rather than pretending", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    const { deleteIdPhotoMoment } = await import("./resources.server");
    await expect(
      deleteIdPhotoMoment("user_1", "shot-1", { remove: async () => {} }),
    ).rejects.toMatchObject({ name: "ResourceStoreUnavailableError" });
  });

  it("fails closed when the store is unconfigured, so /me can degrade to identity only", async () => {
    // `= undefined` would set the string "undefined", which is truthy — the
    // guard would pass and the client would reach the network.
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    const { listIdPhotoMoments } = await import("./resources.server");
    // Matched by name, not `instanceof`: `vi.resetModules()` in afterEach means
    // the class this file imported at the top is a different module instance
    // than the one the dynamic import throws.
    await expect(listIdPhotoMoments("user_1")).rejects.toMatchObject({
      name: "ResourceStoreUnavailableError",
    });
  });

  it("lists only that person's prints", async () => {
    configureR2();

    const { listIdPhotoMoments } = await import("./resources.server");
    const { moments, total } = await listIdPhotoMoments("user_1", {
      list: async () => [
        entry("shot-1.png", "2026-08-01T00:00:00Z"),
        entry("shot-1.source", "2026-08-01T00:00:00Z"),
        entry("shot-2.png", "2026-08-02T00:00:00Z"),
      ],
      sign,
      head: async () => null,
    });

    expect(total).toBe(2);
    expect(moments.map((m) => m.id)).toEqual(["shot-2", "shot-1"]);
    expect(moments[0]?.url).toBe(`https://signed.example/${prefix}shot-2.png`);
  });

  it("orders newest first, and puts prints with no time last", async () => {
    configureR2();

    const { listIdPhotoMoments } = await import("./resources.server");
    const { moments, latestAt } = await listIdPhotoMoments("user_1", {
      // Deliberately not in time order: R2 lists lexicographically, and moment
      // ids are UUIDs, so the store's own order carries no meaning.
      list: async () => [
        entry("b.png", "2026-08-01T00:00:00Z"),
        entry("undated.png"),
        entry("a.png", "2026-08-09T00:00:00Z"),
      ],
      sign,
      head: async () => null,
    });

    expect(moments.map((m) => m.id)).toEqual(["a", "b", "undated"]);
    expect(latestAt?.toISOString()).toBe("2026-08-09T00:00:00.000Z");
  });

  it("reads the SKU back from metadata, whatever case the store returns it in", async () => {
    configureR2();

    const { listIdPhotoMoments } = await import("./resources.server");
    const { moments } = await listIdPhotoMoments("user_1", {
      list: async () => [entry("shot-1.png", "2026-08-01T00:00:00Z")],
      sign,
      // S3 normalises metadata names to lower case on read.
      head: async (key) => ({
        key,
        size: 1,
        metadata: { skuid: "linkedin-smoke", sizeid: "linkedin" },
      }),
    });

    expect(moments[0]).toMatchObject({ skuId: "linkedin-smoke", sizeId: "linkedin" });
  });

  it("maps an AccessDenied list into ResourceStoreUnavailableError so Moments can fail closed", async () => {
    configureR2();

    const { listIdPhotoMoments } = await import("./resources.server");
    const denied = Object.assign(new Error("Access Denied"), {
      name: "AccessDenied",
      Code: "AccessDenied",
    });

    await expect(
      listIdPhotoMoments("user_1", {
        list: async () => {
          throw denied;
        },
      }),
    ).rejects.toMatchObject({ name: "ResourceStoreUnavailableError" });
  });

  it("keeps a bad user id as InvalidResourceKeyError, not a store outage", async () => {
    configureR2();

    const { persistIdPhotoMoment } = await import("./resources.server");
    await expect(
      persistIdPhotoMoment({
        userId: "../escape",
        skuId: "cn-1in-white",
        print: Buffer.from("png"),
      }),
    ).rejects.toMatchObject({ name: "InvalidResourceKeyError" });
  });

  it("maps a rejected put into ResourceStoreUnavailableError", async () => {
    configureR2();

    const { persistIdPhotoMoment } = await import("./resources.server");
    const denied = Object.assign(new Error("Access Denied"), {
      name: "AccessDenied",
      Code: "AccessDenied",
    });

    await expect(
      persistIdPhotoMoment(
        {
          userId: "user_1",
          skuId: "cn-1in-white",
          print: Buffer.from("png"),
        },
        async () => {
          throw denied;
        },
      ),
    ).rejects.toMatchObject({ name: "ResourceStoreUnavailableError" });
  });

  it("bounds head reads to the page while still counting everything", async () => {
    configureR2();

    const heads: string[] = [];
    const { listIdPhotoMoments } = await import("./resources.server");
    const { moments, total } = await listIdPhotoMoments(
      "user_1",
      {
        list: async () => [
          entry("a.png", "2026-08-01T00:00:00Z"),
          entry("b.png", "2026-08-02T00:00:00Z"),
          entry("c.png", "2026-08-03T00:00:00Z"),
        ],
        sign,
        head: async (key) => {
          heads.push(key);
          return null;
        },
      },
      { limit: 1 },
    );

    expect(total).toBe(3);
    expect(moments.map((m) => m.id)).toEqual(["c"]);
    expect(heads).toEqual([`${prefix}c.png`]);
  });
});
