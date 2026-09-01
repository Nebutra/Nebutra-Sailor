import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnabledSku } from "@/catalog/skus";
import {
  DEFAULT_IMAGE2_BASE_URL,
  extractImage2Bytes,
  Image2UnavailableError,
  idPhotoShootBrief,
  image2BaseUrl,
  image2SizeForSku,
  isImage2Configured,
  requireImage2,
  shootWithImage2,
} from "./image2";

describe("image2 consume", () => {
  const keys = ["ROUTER_API_KEY", "IMAGE2_API_KEY", "IMAGE2_BASE_URL"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it("fails closed without a consume key", () => {
    delete process.env.ROUTER_API_KEY;
    delete process.env.IMAGE2_API_KEY;
    expect(isImage2Configured()).toBe(false);
    expect(() => requireImage2()).toThrow(Image2UnavailableError);
  });

  it("picks a portrait size for 领证照 specs and a square for 美签", () => {
    expect(image2SizeForSku(getEnabledSku("cn-1in-white"))).toBe("1024x1536");
    expect(image2SizeForSku(getEnabledSku("visa-us"))).toBe("1024x1024");
  });

  it("consumes router.nebutra.com, not the upstream 302.ai host", () => {
    delete process.env.IMAGE2_BASE_URL;
    expect(DEFAULT_IMAGE2_BASE_URL).toBe("https://router.nebutra.com/v1");
    expect(image2BaseUrl()).toBe("https://router.nebutra.com/v1");
  });

  it("asks image2 to keep the same person on the specified background", () => {
    const idCard = idPhotoShootBrief(getEnabledSku("cn-2in-blue"));
    expect(idCard).toContain("same person");
    expect(idCard).toContain("Official identification");
    expect(idCard).toContain("Leave space above the crown");
    expect(idCard).toContain("标准证件照蓝底");
    expect(idCard).not.toMatch(/生成|Prompt|模型|KUANLAN|VLM/);

    const linkedin = idPhotoShootBrief(getEnabledSku("linkedin-smoke"));
    expect(linkedin).toContain("LinkedIn");
    expect(linkedin).toContain("灰蓝烟雾底");
    expect(linkedin).toContain("navy blazer");
    expect(linkedin).toContain("head tilt");
    expect(linkedin).not.toContain("Official identification");
    expect(linkedin).not.toMatch(/生成|Prompt|模型|KUANLAN|VLM/);

    const knit = idPhotoShootBrief(getEnabledSku("linkedin-smoke-knit"));
    expect(knit).toContain("charcoal merino");
    expect(knit).not.toContain("navy blazer");

    const studio = idPhotoShootBrief(getEnabledSku("linkedin-studio"));
    expect(studio).toContain("American-style");
    expect(studio).toContain("Half-body");
    expect(studio).toContain("质感蓝棚底");
    expect(studio).toContain("simple dark tie");
    expect(studio).toContain("Leave space above the crown");
    expect(studio).not.toContain("标准证件照蓝底");
    expect(studio).not.toContain("Official identification");
    expect(studio).not.toMatch(/生成|Prompt|模型|KUANLAN|VLM/);
  });

  it("reads b64 image bytes from the OpenAI-shaped response", () => {
    const bytes = extractImage2Bytes({
      data: [{ b64_json: Buffer.from("png").toString("base64") }],
    });
    expect(bytes.equals(Buffer.from("png"))).toBe(true);
    expect(() => extractImage2Bytes({ data: [] })).toThrow(Image2UnavailableError);
  });

  it("posts the 302.ai edits fields to router.nebutra.com, never 302.ai", async () => {
    process.env.ROUTER_API_KEY = "sk-router-product";
    delete process.env.IMAGE2_BASE_URL;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://router.nebutra.com/v1/images/edits");
      expect(url).not.toContain("302.ai");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-router-product");
      const body = init?.body as FormData;
      expect(body.get("model")).toBe("gpt-image-2");
      expect(body.get("prompt")).toBe("keep identity");
      expect(body.get("size")).toBe("1024x1536");
      expect(body.get("n")).toBe("1");
      expect(body.get("image")).toBeInstanceOf(Blob);
      return new Response(
        JSON.stringify({ data: [{ b64_json: Buffer.from("png").toString("base64") }] }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchImpl);

    const bytes = await shootWithImage2({
      image: Buffer.from("src"),
      prompt: "keep identity",
      size: "1024x1536",
      mimeType: "image/png",
    });
    expect(bytes.equals(Buffer.from("png"))).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps the SKU shoot brief out of the browser studio", () => {
    const studio = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/IdPhotoStudio.tsx"),
      "utf8",
    );
    expect(studio).not.toMatch(/idPhotoShootBrief|@\/lib\/image2|api\.302|ROUTER_API_KEY/);
    expect(studio).toContain("/api/moments/id-photo");
    expect(studio).toContain("401");
    expect(studio).toContain("先让观澜认识你");
    expect(studio).toContain("skuId");
    expect(studio).toContain("sku.sample");
    expect(studio).toContain("sku-card");
    expect(studio).toContain("/wardrobe");
    expect(studio).not.toContain('className="sku-row"');
  });
});
