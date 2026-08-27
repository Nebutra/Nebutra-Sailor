import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const providerDocs = [
  {
    label: "English",
    path: "apps/sailor-docs/content/docs/en/database/providers.mdx",
  },
  {
    label: "Chinese",
    path: "apps/sailor-docs/content/docs/zh/database/providers.mdx",
  },
] as const;

function readText(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function extractObjectContaining(source: string, needle: string): string {
  const needleIndex = source.indexOf(needle);
  expect(needleIndex, `${needle} should exist`).toBeGreaterThanOrEqual(0);

  const start = source.lastIndexOf("{", needleIndex);
  expect(start, `${needle} should be inside an object literal`).toBeGreaterThanOrEqual(0);

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] !== "}") continue;

    depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  throw new Error(`Could not find closing object brace for ${needle}`);
}

function extractDatasourceDb(schema: string): string {
  const match = schema.match(/datasource\s+db\s+\{[\s\S]*?\n\}/);
  expect(match, "schema.prisma should define datasource db").not.toBeNull();
  return match?.[0] ?? "";
}

function textAfterFirstMatch(source: string, pattern: RegExp, chars = 4_000): string {
  const match = pattern.exec(source);
  if (!match) return "";

  return source.slice(match.index, match.index + chars);
}

describe("PlanetScale database support contract", () => {
  for (const doc of providerDocs) {
    it(`${doc.label} provider docs document PlanetScale Postgres as the supported path`, () => {
      const content = readText(doc.path);
      const postgresContext = textAfterFirstMatch(content, /PlanetScale\s+Postgres/i);
      const vitessContext = textAfterFirstMatch(content, /Vitess\s*\/\s*MySQL/i);
      const checks: Array<[passed: boolean, label: string]> = [
        [postgresContext.length > 0, "PlanetScale Postgres"],
        [postgresContext.includes("DIRECT_URL"), "PlanetScale Postgres DIRECT_URL"],
        [postgresContext.includes("sslmode=require"), "PlanetScale Postgres sslmode=require"],
        [vitessContext.length > 0, "Vitess/MySQL"],
        [/(future|未来)/i.test(vitessContext), "Vitess/MySQL future"],
        [/(template path|模板路径|模板路线)/i.test(vitessContext), "Vitess/MySQL template path"],
      ];
      const missingChecks = checks.filter(([passed]) => !passed).map(([, label]) => label);

      expect(missingChecks).toEqual([]);
    });
  }

  it("registers PlanetScale as a managed PostgreSQL host in create-sailor metadata", () => {
    const metadata = readText("packages/ops/create-sailor/src/utils/database-host-meta.ts");
    const planetscaleHost = extractObjectContaining(metadata, 'id: "planetscale"');

    expect(planetscaleHost).toMatch(/name:\s*"PlanetScale[^"]*"/);
    expect(planetscaleHost).toMatch(/supportedEngines:\s*\[[^\]]*"postgresql"[^\]]*\]/);
    expect(planetscaleHost).toMatch(/forcedEngine:\s*"postgresql"/);
    expect(planetscaleHost).toContain("keepDirectUrl: true");
    expect(planetscaleHost).toMatch(/name:\s*"DATABASE_URL"/);
    expect(planetscaleHost).toMatch(/name:\s*"DIRECT_URL"/);
    expect(planetscaleHost).toContain("sslmode=require");
    expect(planetscaleHost).not.toMatch(/forcedEngine:\s*"mysql"/);
    expect(planetscaleHost).not.toContain('relationMode = "prisma"');
  });

  it("keeps the core Prisma schema on PostgreSQL", () => {
    const schema = readText("packages/platform/db/prisma/schema.prisma");
    const datasource = extractDatasourceDb(schema);

    expect(datasource).toMatch(/provider\s+=\s+"postgresql"/);
    expect(datasource).not.toMatch(/provider\s+=\s+"mysql"/);
  });

  it("keeps database operations docs explicit about PlanetScale Postgres", () => {
    const dbReadme = readText("packages/platform/db/README.md");
    const infraReadme = readText("infra/data/database/README.md");

    expect(dbReadme).toContain("PlanetScale Postgres");
    expect(dbReadme).toContain("port `6432` is PgBouncer");
    expect(dbReadme).toContain("port `5432`");
    expect(infraReadme).toContain("PlanetScale Postgres");
    expect(infraReadme).toContain("PlanetScale Vitess/MySQL is a separate future template path");
    expect(infraReadme).not.toContain("PlanetScale (with adapter)");
  });
});
