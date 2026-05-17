import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pruneMigrationsByFlags } from "./prune-migrations";
import { parseConditionalAnnotations, pruneSchemaByFlags } from "./prune-schema";

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

/// @conditional(access-gate=invite)
enum AccessInviteScope {
  PLATFORM
  TENANT
}

/// @conditional(access-gate=invite)
model AccessInviteCode {
  id    String @id
  scope AccessInviteScope
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

  it("parses conditional enum blocks", () => {
    const out = parseConditionalAnnotations(SAMPLE_SCHEMA);
    const scope = out.find((block) => block.name === "AccessInviteScope");
    expect(scope).toMatchObject({
      name: "AccessInviteScope",
      flag: "access-gate",
      values: ["invite"],
    });
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

  it("removes conditional enum blocks when feature is not selected", () => {
    const pruned = pruneSchemaByFlags(SAMPLE_SCHEMA, { "access-gate": "none" });
    expect(pruned).not.toContain("enum AccessInviteScope");
    expect(pruned).not.toContain("model AccessInviteCode");
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
      // W3b layout: packages/ops/create-sailor/src/utils/ → repo root requires 5 `..`
      path.join(__dirname, "../../../../../packages/platform/db/prisma/schema.prisma"),
      "utf-8",
    );
    const pruned = pruneSchemaByFlags(realSchema, {
      auth: "clerk",
      payment: "stripe",
      "billing-mode": "usage",
      idp: "clerk",
      template: "saas",
      "access-gate": "none",
      community: "none",
    });
    expect(pruned).toContain("generator");
    expect(pruned).toContain("datasource");
    expect(pruned).not.toContain("model AuthUser");
    expect(pruned).not.toContain("model Invoice");
    expect(pruned).not.toContain("model CreditBalance");
    expect(pruned).not.toContain("enum AccessInviteScope");
    expect(pruned).not.toContain("enum AccessInviteStatus");
    expect(pruned).not.toContain("model AccessInviteCode");
    expect(pruned).not.toContain("model AccessInviteRedemption");
    expect(pruned).not.toContain("Cold-start Access Gate");
    expect(pruned).not.toContain("Manus-style invite gate");
    expect(pruned).toContain("model User");
    expect(pruned).toContain("model UsageLedgerEntry");
  });
});

describe("pruneMigrationsByFlags", () => {
  it("removes conditional migration directories when feature is not selected", () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), "tmp-prune-migrations-"));
    try {
      const keepDir = path.join(root, "20260501000000_core");
      const gatedDir = path.join(root, "20260517000000_add_access_invite_gate");
      fs.mkdirSync(keepDir, { recursive: true });
      fs.mkdirSync(gatedDir, { recursive: true });
      fs.writeFileSync(path.join(keepDir, "migration.sql"), "CREATE TABLE core (id text);\n");
      fs.writeFileSync(
        path.join(gatedDir, "migration.sql"),
        "-- @conditional(access-gate=invite)\nCREATE TABLE access_invite_codes (id text);\n",
      );

      const result = pruneMigrationsByFlags(root, { "access-gate": "none" });

      expect(result.removed).toEqual(["20260517000000_add_access_invite_gate"]);
      expect(fs.existsSync(keepDir)).toBe(true);
      expect(fs.existsSync(gatedDir)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps conditional migrations and strips the marker when feature is selected", () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), "tmp-prune-migrations-"));
    try {
      const gatedDir = path.join(root, "20260517000000_add_access_invite_gate");
      const migrationPath = path.join(gatedDir, "migration.sql");
      fs.mkdirSync(gatedDir, { recursive: true });
      fs.writeFileSync(
        migrationPath,
        "-- @conditional(access-gate=invite)\nCREATE TABLE access_invite_codes (id text);\n",
      );

      const result = pruneMigrationsByFlags(root, { "access-gate": "invite" });

      expect(result.kept).toEqual(["20260517000000_add_access_invite_gate"]);
      expect(fs.existsSync(gatedDir)).toBe(true);
      expect(fs.readFileSync(migrationPath, "utf8")).not.toContain("@conditional");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
