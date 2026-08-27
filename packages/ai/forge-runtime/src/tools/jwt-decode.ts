import * as jose from "jose";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  token: z.string().min(1),
});

export type JwtDecodeInput = z.infer<typeof InputSchema>;

export interface JwtDecodeOutput {
  readonly header: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly protectedHeader: jose.ProtectedHeaderParameters;
  readonly engine: string;
  readonly note: string;
}

export const jwtDecodeTool: ForgeToolDefinition<JwtDecodeInput, JwtDecodeOutput> = {
  id: "codec/jwt-decode",
  slug: "jwt-decode",
  category: "codec",
  title: { zh: "JWT 解析", en: "JWT Decode" },
  description: {
    zh: "使用 jose 解码 JWT header/payload（不验证签名）",
    en: "Decode JWT header/payload with jose (signature not verified)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.codec.jwt_decode",
  engine: {
    name: "jose",
    upstream: "https://github.com/panva/jose",
    version: "6.x",
  },
  seoKeywords: { zh: "jwt解析,jwt decode", en: "jwt decode online" },
  inputSchema: InputSchema,
  execute: (input) => {
    const protectedHeader = jose.decodeProtectedHeader(input.token);
    const payload = jose.decodeJwt(input.token);
    return {
      header: { ...protectedHeader } as Record<string, unknown>,
      payload: { ...payload } as Record<string, unknown>,
      protectedHeader,
      engine: "jose",
      note: "Decode only — use jose.jwtVerify for signature verification with keys.",
    };
  },
  unitCost: 0,
};
