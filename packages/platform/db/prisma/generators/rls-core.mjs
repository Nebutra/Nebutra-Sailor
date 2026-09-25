// =============================================================================
// Prisma generator: row-level security from schema.prisma
// =============================================================================
// Runs on every `prisma generate`, next to the client generators, and writes
// the RLS policy for every table the schema declares. Prisma cannot express
// policies, and when they lived in hand-written SQL they drifted into two
// competing models plus a third file (ADR 2026-09-25 database convergence).
// Here the schema is the only source: a model either gets its policy inferred
// or says what it wants in a `/// @rls ...` doc comment — and a model that
// does neither fails generation, so no table ships without an access decision.
//
// Directives (in a model's `///` comment):
//   (none)                inferred: tenant_id → tenant; organization_id → org;
//                         one required relation to a tenant-scoped model → via it
//   @rls tenant(<col>)    "<col>" = current_tenant_id()
//   @rls self             "id" = current_tenant_id()   (the tenant roots)
//   @rls via(<field>)     rows whose parent (relation <field>) is visible
//   @rls global           every role may read and write
//   @rls deny             RLS on, no policy: only owner / BYPASSRLS roles
//   @rls off              RLS disabled — a system table, reached as owner only
//   @rls using(<sql>)     one policy with a custom predicate
//   @rls read(<sql>) write(<sql>)   SELECT sees read OR write; writes need write
//
// Policies carry no TO clause: they bind every role that is neither the table
// owner nor BYPASSRLS, so the runtime role's name (APP_DB_ROLE) never appears
// here and a scaffold may call it anything.
// =============================================================================

const TENANT = "public.current_tenant_id()";

const ident = (name) => `"${name.replaceAll('"', '""')}"`;
const tableOf = (model) =>
  `${ident(model.schema ?? "public")}.${ident(model.dbName ?? model.name)}`;
const columnOf = (field) => field.dbName ?? field.name;

/** `@rls a(x) b(y(z))` → [{ name: "a", arg: "x" }, { name: "b", arg: "y(z)" }] */
export function parseDirective(documentation) {
  const line = (documentation ?? "").split("\n").find((l) => l.trim().startsWith("@rls"));
  if (!line) return null;
  const src = line.trim().slice(4);
  const parts = [];
  let i = 0;
  while (i < src.length) {
    while (src[i] === " ") i++;
    const start = i;
    while (i < src.length && /[a-z_]/i.test(src[i])) i++;
    const name = src.slice(start, i);
    if (!name) throw new Error(`cannot parse "@rls${src}"`);
    let arg = null;
    if (src[i] === "(") {
      let depth = 0;
      const open = i;
      for (; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")" && --depth === 0) break;
      }
      if (depth !== 0) throw new Error(`unbalanced parentheses in "@rls${src}"`);
      arg = src.slice(open + 1, i).trim();
      i++;
    }
    parts.push({ name, arg });
  }
  return parts;
}

/**
 * Decide each model's rule. Returns Map<modelName, Rule> where Rule is one of
 *   { kind: "off" } | { kind: "deny" } | { kind: "policy", read?: sql, write: sql }
 */
export function resolveRules(models) {
  const byName = new Map(models.map((m) => [m.name, m]));
  const rules = new Map();
  const errors = [];

  const directTenantColumn = (model) => {
    const cols = model.fields.filter((f) => f.kind === "scalar").map(columnOf);
    if (cols.includes("tenant_id")) return "tenant_id";
    if (cols.includes("organization_id")) return "organization_id";
    return null;
  };

  // Pass 1: everything that does not depend on another model's rule.
  for (const model of models) {
    let parts;
    try {
      parts = parseDirective(model.documentation);
    } catch (error) {
      errors.push(`${model.name}: ${error.message}`);
      continue;
    }
    const directive = parts?.[0]?.name;

    if (!parts) {
      const col = directTenantColumn(model);
      if (col) rules.set(model.name, { kind: "policy", write: `${ident(col)} = ${TENANT}` });
      continue; // may still be inferred via a parent in pass 2
    }

    switch (directive) {
      case "off":
      case "deny":
        rules.set(model.name, { kind: directive });
        break;
      case "global":
        rules.set(model.name, { kind: "policy", write: "true" });
        break;
      case "self":
        rules.set(model.name, { kind: "policy", write: `"id" = ${TENANT}` });
        break;
      case "tenant":
        if (!parts[0].arg)
          errors.push(`${model.name}: @rls tenant needs a column, e.g. tenant(tenant_id)`);
        else rules.set(model.name, { kind: "policy", write: `${ident(parts[0].arg)} = ${TENANT}` });
        break;
      case "using":
        rules.set(model.name, { kind: "policy", write: parts[0].arg });
        break;
      case "read": {
        const write = parts.find((p) => p.name === "write")?.arg;
        if (!parts[0].arg || !write)
          errors.push(`${model.name}: @rls read(...) needs a write(...) too`);
        else rules.set(model.name, { kind: "policy", read: parts[0].arg, write });
        break;
      }
      case "via":
        break; // pass 2
      default:
        errors.push(`${model.name}: unknown directive @rls ${directive}`);
    }
  }

  // Pass 2: children, whose rule is "the parent row is visible".
  const viaParent = (model, field) => {
    const parent = byName.get(field.type);
    const parentRule = rules.get(field.type);
    if (!parent || parentRule?.kind !== "policy" || parentRule.read) return null;
    const from = field.relationFromFields ?? [];
    const to = field.relationToFields ?? [];
    if (from.length !== 1 || to.length !== 1) return null;
    const fromCol = columnOf(model.fields.find((f) => f.name === from[0]));
    const toCol = columnOf(parent.fields.find((f) => f.name === to[0]));
    return `${ident(fromCol)} IN (SELECT ${ident(toCol)} FROM ${tableOf(parent)} WHERE ${parentRule.write})`;
  };

  for (const model of models) {
    if (rules.has(model.name)) continue;
    const parts = parseDirective(model.documentation);
    const relations = model.fields.filter(
      (f) => f.kind === "object" && f.relationFromFields?.length,
    );

    if (parts?.[0]?.name === "via") {
      const field = relations.find((f) => f.name === parts[0].arg);
      const sql = field && viaParent(model, field);
      if (sql) rules.set(model.name, { kind: "policy", write: sql });
      else
        errors.push(
          `${model.name}: @rls via(${parts[0].arg}) must name a single-column relation to a model with a plain policy`,
        );
      continue;
    }

    const candidates = relations
      .filter((f) => f.isRequired)
      .map((f) => viaParent(model, f))
      .filter(Boolean);
    if (candidates.length === 1) {
      rules.set(model.name, { kind: "policy", write: candidates[0] });
    } else {
      errors.push(
        `${model.name}: no tenant column and ${candidates.length === 0 ? "no" : "more than one"} tenant-scoped parent — ` +
          "say what it is: /// @rls global | deny | off | self | tenant(<col>) | via(<field>) | using(<sql>)",
      );
    }
  }

  if (errors.length) {
    throw new Error(`Row-level security is undecided for:\n  - ${errors.join("\n  - ")}`);
  }
  return rules;
}

export function renderSql(models, rules) {
  const managed = models.map((m) => ({ model: m, rule: rules.get(m.name) }));
  const policyNames = [];
  const body = [];

  for (const { model, rule } of managed) {
    const table = tableOf(model);
    const name = model.dbName ?? model.name;
    body.push(`-- ${model.name}`);
    if (rule.kind === "off") {
      body.push(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`, "");
      continue;
    }
    body.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    if (rule.kind === "policy" && rule.read) {
      policyNames.push(
        [model.schema ?? "public", name, `${name}_read`],
        [model.schema ?? "public", name, `${name}_write`],
      );
      body.push(
        `DROP POLICY IF EXISTS ${ident(`${name}_read`)} ON ${table};`,
        `CREATE POLICY ${ident(`${name}_read`)} ON ${table} FOR SELECT USING (${rule.read});`,
        `DROP POLICY IF EXISTS ${ident(`${name}_write`)} ON ${table};`,
        `CREATE POLICY ${ident(`${name}_write`)} ON ${table} FOR ALL USING (${rule.write}) WITH CHECK (${rule.write});`,
      );
    } else if (rule.kind === "policy") {
      policyNames.push([model.schema ?? "public", name, `${name}_rls`]);
      body.push(
        `DROP POLICY IF EXISTS ${ident(`${name}_rls`)} ON ${table};`,
        `CREATE POLICY ${ident(`${name}_rls`)} ON ${table} FOR ALL USING (${rule.write}) WITH CHECK (${rule.write});`,
      );
    }
    body.push("");
  }

  const schemas = [...new Set(models.map((m) => m.schema ?? "public"))];
  const keep = policyNames.map(([s, t, p]) => `(${lit(s)}, ${lit(t)}, ${lit(p)})`).join(",\n    ");

  return [
    "-- GENERATED by prisma/generators/rls.mjs from schema.prisma — do not edit.",
    "-- Change a table's access rule with a `/// @rls ...` comment on its model.",
    "-- Idempotent: applied after every `prisma migrate deploy` by `pnpm db:deploy`.",
    "",
    "CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS text",
    "  LANGUAGE sql STABLE",
    "  AS $$ SELECT COALESCE(current_setting('app.current_tenant_id', true), '') $$;",
    "",
    "-- Any policy on these schemas that this file does not define is stale: a",
    "-- renamed rule, a dropped table, or one written by hand. It goes.",
    "DO $$",
    "DECLARE p record;",
    "BEGIN",
    "  FOR p IN",
    "    SELECT schemaname, tablename, policyname FROM pg_policies",
    `    WHERE schemaname IN (${schemas.map(lit).join(", ")})`,
    "      AND (schemaname, tablename, policyname) NOT IN (",
    `    ${keep}`,
    "      )",
    "  LOOP",
    "    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);",
    "  END LOOP;",
    "END $$;",
    "",
    ...body,
    "-- The second helper from before convergence; nothing references it once",
    "-- the stale policies above are gone.",
    "DROP FUNCTION IF EXISTS public.current_org_id();",
    "",
  ].join("\n");
}

function lit(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
