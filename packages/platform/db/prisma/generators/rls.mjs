#!/usr/bin/env node
// Prisma generator entry point: row-level security from schema.prisma.
// The rules and SQL live in ./rls-core.mjs (importable by tests); this file
// only speaks Prisma's generator protocol. Registered in schema.prisma as
// `generator rls`, so it runs on every `prisma generate`.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import gh from "@prisma/generator-helper";
import { renderSql, resolveRules } from "./rls-core.mjs";

gh.generatorHandler({
  onManifest: () => ({ prettyName: "Row-level security", defaultOutput: "../generated/rls.sql" }),
  onGenerate: async (options) => {
    const models = options.dmmf.datamodel.models;
    const rules = resolveRules(models);
    const out = options.generator.output?.value;
    if (!out) throw new Error("rls generator needs an output path");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderSql(models, rules));
  },
});
