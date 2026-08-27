import { randomInt } from "node:crypto";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  length: z.number().int().min(4).max(128).default(16),
  uppercase: z.boolean().default(true),
  lowercase: z.boolean().default(true),
  digits: z.boolean().default(true),
  symbols: z.boolean().default(false),
});

export type PasswordGenerateInput = z.infer<typeof InputSchema>;

export interface PasswordGenerateOutput {
  readonly password: string;
  readonly length: number;
}

function run(input: PasswordGenerateInput): PasswordGenerateOutput {
  const length = input.length ?? 16;
  let alphabet = "";
  if (input.uppercase !== false) alphabet += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (input.lowercase !== false) alphabet += "abcdefghijklmnopqrstuvwxyz";
  if (input.digits !== false) alphabet += "0123456789";
  if (input.symbols) alphabet += "!@#$%^&*_-+=?";
  if (!alphabet) {
    throw new Error("At least one character class must be enabled");
  }
  let password = "";
  for (let i = 0; i < length; i++) {
    password += alphabet[randomInt(alphabet.length)] ?? "";
  }
  return { password, length };
}

export const passwordGenerateTool: ForgeToolDefinition<
  PasswordGenerateInput,
  PasswordGenerateOutput
> = {
  id: "security/password-generate",
  slug: "password-generate",
  category: "hash",
  title: { zh: "密码生成器", en: "Password Generator" },
  description: {
    zh: "密码学安全随机密码生成器",
    en: "Cryptographically strong password generator",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.security.password_generate",
  roots: ["generator"],
  engine: {
    name: "node-crypto",
    upstream: "node:crypto randomInt",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "密码生成器,随机密码生成,password generator",
    en: "password generator, strong password generator online",
  },
  inputSchema: InputSchema,
  execute: run,
  unitCost: 0,
};
