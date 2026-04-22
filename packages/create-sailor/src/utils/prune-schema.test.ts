import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseConditionalAnnotations, pruneSchemaByFlags } from "./prune-schema.js";

const SAMPLE_SCHEMA = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    String @id
  email String
}

/// @conditional(auth=betterauth)
model AuthUser {
  id    String @id
  email String
}

/// @conditional(auth=betterauth)
model AuthSession {
  id     String @id
  userId String
}

/// @conditional(payment=wechat|alipay)
model Invoice {
  id     String @id
  amount Int
}

/// @conditional(template=ecommerce)
model Product {
  id   String @id
  name String
}

/// @conditional(billing-mode=credits)
model CreditBalance {
  id     String @id
  amount Int
}

enum UserRole {
  ADMIN
  USER
}
`;

describe("parseConditionalAnnotations", () => {
  it("parses single-value flag", () => {
    const out = parseConditionalAnnotations(SAMPLE_SCHEMA);
    const authUser = out.find((model) => model.name === "AuthUser");
    expect(authUser).toMatchObject({
      name: "AuthUser",
      flag: "auth",
      values: ["betterauth"],
    });
  });

  it("parses pipe-separated values", () => {
    const invoice = parseConditionalAnnotations(SAMPLE_SCHEMA).find(
      (model) => model.name === "Invoice",
    );
    expect(invoice?.values).toEqual(["wechat", "alipay"]);
  });

  it("ignores unannotated models", () => {
    const out = parseConditionalAnnotations(SAMPLE_SCHEMA);
    expect(out.find((model) => model.name === "User")).toBeUndefined();
  });
});

describe("pruneSchemaByFlags", () => {
  it("keeps annotated model when flag matches", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "betterauth" });
    expect(pruned).toMatch(/model AuthUser\s*\{/);
    expect(pruned).toMatch(/model AuthSession\s*\{/);
  });

  it("removes annotated model when flag doesn't match", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "clerk" });
    expect(pruned).not.toContain("AuthUser");
    expect(pruned).not.toContain("AuthSession");
  });

  it("removes all conditionals when flag=none", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "none" });
    expect(pruned).not.toContain("AuthUser");
  });

  it("honors pipe-or for payment (wechat matches)", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { payment: "wechat" });
    expect(pruned).toMatch(/model Invoice\s*\{/);
  });

  it("honors pipe-or for payment (stripe doesn't)", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { payment: "stripe" });
    expect(pruned).not.toContain("Invoice");
  });

  it("always keeps unannotated models", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "none", payment: "none" });
    expect(pruned).toMatch(/model User\s*\{/);
  });

  it("removes the @conditional comment itself from kept models", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "betterauth" });
    expect(pruned).not.toContain("@conditional");
  });

  it("handles multiple flags simultaneously", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, {
      auth: "clerk",
      payment: "wechat",
      template: "saas",
      "billing-mode": "usage",
    });
    expect(pruned).not.toContain("AuthUser");
    expect(pruned).toMatch(/model Invoice\s*\{/);
    expect(pruned).not.toContain("Product");
    expect(pruned).not.toContain("CreditBalance");
    expect(pruned).toMatch(/model User\s*\{/);
  });

  it("preserves generator / datasource / enum blocks", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "none" });
    expect(pruned).toContain("generator client");
    expect(pruned).toContain("datasource db");
    expect(pruned).toContain("enum UserRole");
  });

  it("is idempotent on already-pruned schema", () => {
    const once = pruneSchemaByFlags(SAMPLE_SCHEMA, { auth: "clerk" });
    const twice = pruneSchemaByFlags(once, { auth: "clerk" });
    expect(twice).toBe(once);
  });

  it("handles real production schema without errors", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const realSchema = fs.readFileSync(
      path.join(__dirname, "../../../../packages/db/prisma/schema.prisma"),
      "utf-8",
    );
    const pruned = pruneSchemaByFlags(realSchema, {
      auth: "clerk",
      payment: "stripe",
      "billing-mode": "usage",
      idp: "clerk",
      template: "saas",
      community: "none",
    });
    expect(pruned).toContain("generator");
    expect(pruned).toContain("datasource");
    expect(pruned).not.toContain("model AuthUser");
    expect(pruned).not.toContain("model Invoice");
    expect(pruned).not.toContain("model CreditBalance");
    expect(pruned).toContain("model User");
    expect(pruned).toContain("model UsageLedgerEntry");
  });
});
