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

  it("places wardrobe stills under the public wardrobe prefix as PNG", () => {
    expect(wardrobeSampleKey("blazer")).toBe("kuanlan/wardrobe/blazer.png");
    expect(wardrobeSampleSrc("knit")).toBe("https://cdn.nebutra.com/kuanlan/wardrobe/knit.png");
    expect(() => wardrobeSampleSrc("../face")).toThrow(InvalidResourceKeyError);
  });

  it("places 领证照 samples under the public skus prefix", () => {
    expect(skuSampleKey("cn-2in-white")).toBe("kuanlan/skus/cn-2in-white.jpg");
    expect(skuSampleSrc("visa-us")).toBe("https://cdn.nebutra.com/kuanlan/skus/visa-us.jpg");
    expect(skuSampleSrc("linkedin-studio")).toBe(
      "https://cdn.nebutra.com/kuanlan/skus/linkedin-studio.jpg?v=2",
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
        source: Buffer.from("jpg"),
        sourceType: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(ResourceStoreUnavailableError);
  });

  it("writes the print and source to the uploads bucket", async () => {
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
        source: Buffer.from("jpg"),
        sourceType: "image/jpeg",
      },
      upload,
    );

    expect(stored).toEqual({
      id: "shot-1",
      key: "kuanlan/moments/id-photo/user_1/shot-1.png",
      url: "https://signed.example/kuanlan/moments/id-photo/user_1/shot-1.png",
      sourceKey: "kuanlan/moments/id-photo/user_1/shot-1.source",
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0]?.[0]).toBe("kuanlan/moments/id-photo/user_1/shot-1.png");
    expect(upload.mock.calls[0]?.[2]).toMatchObject({
      bucket: "uploads",
      contentType: "image/png",
      metadata: { skuId: "cn-1in-white", app: "kuanlan", userId: "user_1" },
    });
    expect(upload.mock.calls[1]?.[0]).toBe("kuanlan/moments/id-photo/user_1/shot-1.source");
    expect(upload.mock.calls[1]?.[2]).toMatchObject({
      bucket: "uploads",
      contentType: "image/jpeg",
    });
  });

  it("lists only that person's prints", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "account";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";

    const { listIdPhotoMoments } = await import("./resources.server");
    const moments = await listIdPhotoMoments("user_1", {
      list: async () => [
        "kuanlan/moments/id-photo/user_1/shot-1.png",
        "kuanlan/moments/id-photo/user_1/shot-1.source",
        "kuanlan/moments/id-photo/user_1/shot-2.png",
      ],
      sign: async (key) => `https://signed.example/${key}`,
    });

    expect(moments).toEqual([
      {
        id: "shot-1",
        key: "kuanlan/moments/id-photo/user_1/shot-1.png",
        url: "https://signed.example/kuanlan/moments/id-photo/user_1/shot-1.png",
      },
      {
        id: "shot-2",
        key: "kuanlan/moments/id-photo/user_1/shot-2.png",
        url: "https://signed.example/kuanlan/moments/id-photo/user_1/shot-2.png",
      },
    ]);
  });
});
