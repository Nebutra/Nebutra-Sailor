import { describe, expect, it } from "vitest";
import { buildStoreZip, extractFileFromJobResult } from "./zip-store";

describe("buildStoreZip", () => {
  it("builds a zip with local + central headers", () => {
    const zip = buildStoreZip([
      { name: "a.txt", data: Buffer.from("hello") },
      { name: "b.txt", data: Buffer.from("world") },
    ]);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.includes(Buffer.from("hello"))).toBe(true);
    expect(zip.includes(Buffer.from("world"))).toBe(true);
    // EOCD signature somewhere at end
    expect(zip.subarray(zip.length - 22).readUInt32LE(0)).toBe(0x06054b50);
  });
});

describe("extractFileFromJobResult", () => {
  it("reads image-compress style output", () => {
    const entry = extractFileFromJobResult(
      { base64: Buffer.from("pngdata").toString("base64"), contentType: "image/png" },
      "shot",
    );
    expect(entry?.name).toBe("shot.png");
    expect(entry?.data.toString()).toBe("pngdata");
  });

  it("returns null without base64", () => {
    expect(extractFileFromJobResult({ ok: true }, "x")).toBeNull();
  });
});
