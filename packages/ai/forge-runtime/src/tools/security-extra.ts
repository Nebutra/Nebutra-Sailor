/**
 * Hash / security extras — sha512, HMAC, file checksum, password strength (zxcvbn-ts).
 */
import { createHash, createHmac } from "node:crypto";
import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

const zxcvbn = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
});

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

export const sha512Tool = tool({
  id: "hash/sha512",
  slug: "sha512",
  category: "hash",
  title: { zh: "SHA-512", en: "SHA-512 Hash" },
  description: { zh: "Node crypto SHA-512 摘要", en: "SHA-512 digest via node:crypto" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.hash.sha512",
  engine: { name: "node-crypto", upstream: "node:crypto", version: "runtime" },
  seoKeywords: { zh: "sha512在线,sha512哈希", en: "sha512 hash online" },
  inputSchema: z.object({ text: z.string() }),
  execute: (input: { text: string }) => ({
    hex: createHash("sha512").update(input.text, "utf8").digest("hex"),
    algorithm: "sha512" as const,
    engine: "node:crypto",
  }),
});

export const hmacTool = tool({
  id: "hash/hmac",
  slug: "hmac",
  category: "hash",
  title: { zh: "HMAC", en: "HMAC" },
  description: { zh: "HMAC-SHA256/512 签名", en: "HMAC-SHA256/512 via node:crypto" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.hash.hmac",
  engine: { name: "node-crypto", upstream: "node:crypto", version: "runtime" },
  seoKeywords: { zh: "hmac在线计算,hmac-sha256", en: "hmac sha256 online" },
  inputSchema: z.object({
    text: z.string(),
    secret: z.string().min(1),
    algorithm: z.enum(["sha256", "sha512", "sha1"]).default("sha256"),
    encoding: z.enum(["hex", "base64"]).default("hex"),
  }),
  execute: (input: {
    text: string;
    secret: string;
    algorithm?: "sha256" | "sha512" | "sha1";
    encoding?: "hex" | "base64";
  }) => {
    const algorithm = input.algorithm ?? "sha256";
    const encoding = input.encoding ?? "hex";
    const digest = createHmac(algorithm, input.secret).update(input.text, "utf8").digest(encoding);
    return { digest, algorithm, encoding, engine: "node:crypto" };
  },
});

export const fileChecksumTool = tool({
  id: "hash/file-checksum",
  slug: "file-checksum",
  category: "hash",
  title: { zh: "文件校验和", en: "File Checksum" },
  description: { zh: "对 Base64 文件内容计算 MD5/SHA 校验和", en: "Checksum Base64 file payloads" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.hash.file_checksum",
  engine: { name: "node-crypto", upstream: "node:crypto", version: "runtime" },
  seoKeywords: { zh: "文件md5,文件sha256校验", en: "file checksum md5 sha256 online" },
  inputSchema: z.object({
    fileBase64: z.string().min(1),
    algorithms: z
      .array(z.enum(["md5", "sha1", "sha256", "sha512"]))
      .min(1)
      .default(["md5", "sha256"]),
  }),
  execute: (input: {
    fileBase64: string;
    algorithms?: Array<"md5" | "sha1" | "sha256" | "sha512">;
  }) => {
    const cleaned = input.fileBase64.includes(",")
      ? (input.fileBase64.split(",").pop() ?? input.fileBase64)
      : input.fileBase64;
    const buf = Buffer.from(cleaned, "base64");
    const algorithms = input.algorithms ?? ["md5", "sha256"];
    const hashes: Record<string, string> = {};
    for (const algo of algorithms) {
      hashes[algo] = createHash(algo).update(buf).digest("hex");
    }
    return {
      bytes: buf.length,
      hashes,
      engine: "node:crypto",
    };
  },
});

export const passwordStrengthTool = tool({
  id: "security/password-strength",
  slug: "password-strength",
  category: "hash",
  title: { zh: "密码强度", en: "Password Strength" },
  description: {
    zh: "zxcvbn-ts 估算密码强度与破解时间",
    en: "Estimate password strength with zxcvbn-ts",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.security.password_strength",
  engine: {
    name: "zxcvbn-ts",
    upstream: "https://github.com/zxcvbn-ts/zxcvbn",
    version: "3.x",
  },
  seoKeywords: { zh: "密码强度检测,密码安全检测", en: "password strength checker online" },
  inputSchema: z.object({
    password: z.string().min(1).max(256),
    userInputs: z.array(z.string()).max(20).default([]),
  }),
  execute: (input: { password: string; userInputs?: string[] }) => {
    const result = zxcvbn.check(input.password, input.userInputs ?? []);
    return {
      score: result.score,
      crackTimes: result.crackTimes,
      feedback: result.feedback,
      guessesLog10: result.guessesLog10,
      calcTime: result.calcTime,
      engine: "zxcvbn-ts",
    };
  },
});

export const securityExtraTools: readonly AnyForgeToolDefinition[] = [
  sha512Tool,
  hmacTool,
  fileChecksumTool,
  passwordStrengthTool,
];
