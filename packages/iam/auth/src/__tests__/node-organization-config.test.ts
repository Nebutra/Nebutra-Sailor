import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NODE_ORGANIZATION_SCHEMA } from "../providers/better-auth/node-organization-config";

const schema = readFileSync(
  resolve(__dirname, "../../../../platform/db/prisma/schema.prisma"),
  "utf8",
);

/** Prisma model name → its @@schema, for every model in the schema. */
const models = new Map(
  [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map(([, name, body]) => [
    `${name!.charAt(0).toLowerCase()}${name!.slice(1)}`,
    body!.match(/@@schema\("(\w+)"\)/)?.[1],
  ]),
);

describe("NODE_ORGANIZATION_SCHEMA", () => {
  it.each(
    Object.entries(NODE_ORGANIZATION_SCHEMA),
  )("maps %s onto a Better Auth table the edge also reads", (_model, { modelName }) => {
    expect(models.get(modelName)).toBe("better_auth");
  });
});
