import { afterEach, describe, expect, it } from "vitest";
import { getEnabledSku } from "@/catalog/skus";
import {
  extractImage2Bytes,
  Image2UnavailableError,
  idPhotoShootBrief,
  image2SizeForSku,
  isImage2Configured,
  requireImage2,
} from "./image2";

describe("image2 consume", () => {
  const keys = ["IMAGE2_API_KEY", "SENSENOVA_API_KEY"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it("fails closed without a consume key", () => {
    delete process.env.IMAGE2_API_KEY;
    delete process.env.SENSENOVA_API_KEY;
    expect(isImage2Configured()).toBe(false);
    expect(() => requireImage2()).toThrow(Image2UnavailableError);
  });

  it("picks a portrait size for 领证照 specs and a square for 美签", () => {
    expect(image2SizeForSku(getEnabledSku("cn-1in-white"))).toBe("1024x1536");
    expect(image2SizeForSku(getEnabledSku("visa-us"))).toBe("1024x1024");
  });

  it("asks image2 to keep the same person on the specified background", () => {
    const brief = idPhotoShootBrief(getEnabledSku("cn-2in-blue"));
    expect(brief).toContain("same person");
    expect(brief).toContain("标准证件照蓝底");
    expect(brief).not.toMatch(/生成|Prompt|模型/);
  });

  it("reads b64 image bytes from the OpenAI-shaped response", () => {
    const bytes = extractImage2Bytes({
      data: [{ b64_json: Buffer.from("png").toString("base64") }],
    });
    expect(bytes.equals(Buffer.from("png"))).toBe(true);
    expect(() => extractImage2Bytes({ data: [] })).toThrow(Image2UnavailableError);
  });
});
