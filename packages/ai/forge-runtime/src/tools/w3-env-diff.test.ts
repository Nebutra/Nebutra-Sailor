// biome-ignore-all lint/suspicious/noTemplateCurlyInString: dotenv ${VAR} interpolation is the syntax under test, not a template string
/**
 * Tests for the env-diff engine.
 *
 * The brief (docs/plans/tools/env-diff.md §7) names ten domain rules; each one
 * has at least one case here, named after the rule it defends. The point of
 * this tool is that a naive line diff gets the category wrong, so the tests
 * that matter most are the ones a line-based implementation would fail:
 * key-order independence, union-of-keys, and equality-under-redaction.
 */
import { describe, expect, it } from "vitest";
import {
  diffEnv,
  type EnvDiffEntry,
  type EnvDiffResult,
  envDiffInputSchema,
  envDiffTool,
  isSecretKey,
  parseEnvFile,
  REDACTION_MASK,
  w3EnvDiffTools,
} from "./w3-env-diff";

function run(input: unknown): EnvDiffResult {
  const parsed = envDiffInputSchema.parse(input);
  return envDiffTool.execute(parsed) as EnvDiffResult;
}

function entry(result: EnvDiffResult, key: string): EnvDiffEntry {
  const found = result.entries.find((e) => e.key === key);
  if (!found) throw new Error(`no entry for ${key} (have: ${result.entries.map((e) => e.key)})`);
  return found;
}

describe("descriptor", () => {
  it("is a pure, metered comparator declared for both runtimes", () => {
    expect(envDiffTool.id).toBe("dev/env-diff");
    expect(envDiffTool.slug).toBe("env-diff");
    expect(envDiffTool.sideEffect).toBe("pure");
    expect(envDiffTool.meterId).toBe("forge.dev.env_diff");
    expect(envDiffTool.roots).toContain("comparator");
    // The paste holds live credentials, so the browser must be able to run it.
    expect(envDiffTool.runtime).toContain("client");
    expect(envDiffTool.runtime).toContain("server");
    expect(w3EnvDiffTools).toContain(envDiffTool);
  });

  it("names the spec it implements, not a stand-in library", () => {
    expect(envDiffTool.engine.upstream).toMatch(/dotenv/i);
    expect(envDiffTool.engine.upstream).toMatch(/1003\.1/);
  });

  it("is bilingual in title, description and keywords", () => {
    for (const field of [envDiffTool.title, envDiffTool.description, envDiffTool.seoKeywords]) {
      expect(field.zh.length).toBeGreaterThan(0);
      expect(field.en.length).toBeGreaterThan(0);
    }
  });
});

describe("know-how #1 — identity is the key, not the line", () => {
  it("reports no differences when the same pairs are reordered", () => {
    const a = "ALPHA=1\nBETA=2\nGAMMA=3\n";
    const b = "GAMMA=3\n\nBETA=2\nALPHA=1\n";
    const result = run({ envA: a, envB: b });
    expect(result.differences).toBe(0);
    expect(result.counts).toEqual({
      unchanged: 3,
      changed: 0,
      added: 0,
      removed: 0,
      commentedOut: 0,
    });
  });

  it("sorts entries by key so two runs of the same input agree byte for byte", () => {
    const input = { envA: "B=2\nA=1\n", envB: "A=1\nB=9\n" };
    const first = run(input);
    const second = run(input);
    expect(first).toEqual(second);
    expect(first.entries.map((e) => e.key)).toEqual(["A", "B"]);
  });
});

describe("know-how #2 — the base is the union of keys", () => {
  it("keeps a key that exists on only one side, as added or removed", () => {
    const result = run({
      envA: "SHARED=1\nONLY_A=x\n",
      envB: "SHARED=1\nONLY_B=y\n",
    });
    expect(entry(result, "ONLY_A").status).toBe("removed");
    expect(entry(result, "ONLY_A").valueB).toBeNull();
    expect(entry(result, "ONLY_B").status).toBe("added");
    expect(entry(result, "ONLY_B").valueA).toBeNull();
    expect(result.totalKeys).toBe(3);
    expect(result.differences).toBe(2);
  });

  it("distinguishes an empty assignment from an absent key", () => {
    const result = run({ envA: "APP_ENV=\n", envB: "" });
    const e = entry(result, "APP_ENV");
    expect(e.valueA).toBe("");
    expect(e.valueB).toBeNull();
    expect(e.status).toBe("removed");
  });
});

describe("know-how #3 — export prefixes and inline comments", () => {
  it("extracts the key from an export-prefixed line", () => {
    const result = run({ envA: "export DATABASE_URL=postgres://a\n", envB: "" });
    expect(entry(result, "DATABASE_URL").valueA).toBe("postgres://a");
  });

  it("strips a whitespace-preceded inline comment from the value", () => {
    const result = run({ envA: "PORT=3000 # dev only\n", envB: "PORT=3000\n" });
    expect(entry(result, "PORT").valueA).toBe("3000");
    expect(entry(result, "PORT").status).toBe("unchanged");
  });

  it("keeps a # that is part of the value (URL fragment, not a comment)", () => {
    const result = run({ envA: "SITE=http://x/#frag\n", envB: "SITE=http://x/\n" });
    expect(entry(result, "SITE").valueA).toBe("http://x/#frag");
    expect(entry(result, "SITE").status).toBe("changed");
  });
});

describe("know-how #4 — quoting is representation, not identity", () => {
  it("compares a quoted and an unquoted value as the same value", () => {
    const result = run({ envA: 'API_URL="https://a"\n', envB: "API_URL=https://a\n" });
    expect(entry(result, "API_URL").status).toBe("unchanged");
  });

  it("strips single quotes and backticks too, and leaves single-quoted text literal", () => {
    const result = run({ envA: "A='a\\nb'\nB=`v`\n", envB: "A=a\\nb\nB=v\n" });
    expect(entry(result, "A").status).toBe("unchanged");
    expect(entry(result, "B").status).toBe("unchanged");
  });

  it("unescapes \\n inside double quotes, matching a literal multi-line value", () => {
    const multi = 'PRIVATE_KEY="line1\nline2"\n';
    const escaped = 'PRIVATE_KEY="line1\\nline2"\n';
    const result = run({ envA: multi, envB: escaped });
    expect(entry(result, "PRIVATE_KEY").valueA).toBe(REDACTION_MASK);
    expect(entry(result, "PRIVATE_KEY").secretChanged).toBe(false);
    expect(entry(result, "PRIVATE_KEY").status).toBe("unchanged");
  });

  it("names the assignments a stray quote swallowed instead of losing them silently", () => {
    // The reference parser closes `A="` on the *next* quote it finds, which is
    // three lines down — so B and C stop existing. Without a warning the user
    // just sees them as "removed" against the other file, with no reason.
    const result = run({ envA: 'A="oops\nB=1\nC="x"\n', envB: "A=oops\nB=1\nC=x\n" });
    const warning = result.warnings.find((w) => w.type === "quoteMismatch");
    expect(warning?.file).toBe("A");
    expect(warning?.key).toBe("A");
    expect(warning?.message).toContain("B (line 2)");
    expect(warning?.message).toContain("C (line 3)");
    expect(entry(result, "B").status).toBe("added");
  });

  it("does not warn when a quoted value legitimately spans lines", () => {
    const result = run({
      envA: 'CERT="-----BEGIN-----\nbody\n-----END-----"\n',
      envB: 'CERT="-----BEGIN-----\nbody\n-----END-----"\n',
    });
    expect(result.warnings).toHaveLength(0);
    expect(result.differences).toBe(0);
  });

  it("warns on an unterminated quote instead of normalising it silently", () => {
    const result = run({ envA: 'BROKEN="abc\nNEXT=1\n', envB: "NEXT=1\n" });
    const warning = result.warnings.find((w) => w.type === "quoteMismatch");
    expect(warning).toBeDefined();
    expect(warning?.file).toBe("A");
    expect(warning?.key).toBe("BROKEN");
    expect(warning?.line).toBe(1);
    // The following line still parses — one bad quote does not eat the file.
    expect(entry(result, "NEXT").status).toBe("unchanged");
  });
});

describe("know-how #5 — ${VAR} is compared literally, never resolved", () => {
  it("treats an unresolved reference as equal to itself and flags it", () => {
    const file = 'PUSHER_APP_KEY=abc\nMIX_PUSHER_APP_KEY="${PUSHER_APP_KEY}"\n';
    const result = run({ envA: file, envB: file });
    const e = entry(result, "MIX_PUSHER_APP_KEY");
    // The key matches the secret heuristic, but a value that is only a
    // reference carries no credential — masking it would hide the one useful
    // fact (this side defers to another key) for no privacy gain.
    expect(e.valueA).toBe("${PUSHER_APP_KEY}");
    expect(e.isSecret).toBe(true);
    expect(e.interpolated).toBe(true);
    expect(e.status).toBe("unchanged");
  });

  it("still masks a secret that only partly interpolates", () => {
    const result = run({ envA: "API_KEY=sk-${SUFFIX}\n", envB: "API_KEY=sk-live\n" });
    expect(entry(result, "API_KEY").valueA).toBe(REDACTION_MASK);
    expect(entry(result, "API_KEY").interpolated).toBe(true);
    expect(entry(result, "API_KEY").secretChanged).toBe(true);
  });

  it("does not expand a reference to make it match the expanded side", () => {
    const result = run({
      envA: "FOO=bar\nTARGET=${FOO}\n",
      envB: "FOO=bar\nTARGET=bar\n",
    });
    expect(entry(result, "TARGET").status).toBe("changed");
    expect(result.interpolationNote).toMatch(/never resolved/i);
  });
});

describe("know-how #6 — duplicate keys: last wins, and every one is reported", () => {
  it("keeps the last assignment and names the earlier lines", () => {
    const result = run({ envA: "DEBUG=true\nOTHER=1\nDEBUG=false\n", envB: "DEBUG=false\n" });
    expect(entry(result, "DEBUG").valueA).toBe("false");
    expect(entry(result, "DEBUG").status).toBe("unchanged");
    const warning = result.warnings.find((w) => w.type === "duplicateKey");
    expect(warning?.file).toBe("A");
    expect(warning?.key).toBe("DEBUG");
    expect(warning?.message).toContain("1, 3");
  });

  it("does not warn for a key assigned once", () => {
    const result = run({ envA: "A=1\n", envB: "A=1\n" });
    expect(result.warnings).toHaveLength(0);
  });
});

describe("know-how #7 — case sensitivity is opt-in", () => {
  it("treats Api_Key and API_KEY as two keys by default", () => {
    const result = run({ envA: "Api_Key=1\n", envB: "API_KEY=1\n" });
    expect(result.totalKeys).toBe(2);
    expect(result.differences).toBe(2);
  });

  it("merges them when caseInsensitiveKeys is on", () => {
    const result = run({
      envA: "Api_Key=1\n",
      envB: "API_KEY=1\n",
      options: { caseInsensitiveKeys: true },
    });
    expect(result.totalKeys).toBe(1);
    expect(result.differences).toBe(0);
  });

  it("warns when folding merges two distinct keys inside one file", () => {
    const result = run({
      envA: "Api_Key=1\nAPI_KEY=2\n",
      envB: "API_KEY=2\n",
      options: { caseInsensitiveKeys: true },
    });
    const warning = result.warnings.find((w) => w.type === "duplicateKey" && w.file === "A");
    expect(warning?.message).toMatch(/collide/i);
    expect(result.differences).toBe(0);
  });
});

describe("know-how #8 — commented-out is not the same as absent", () => {
  it("reports a commented-out assignment as its own status", () => {
    const result = run({ envA: "# API_KEY=xxx\n", envB: "API_KEY=yyy\n" });
    const e = entry(result, "API_KEY");
    expect(e.status).toBe("commentedOutInA");
    expect(e.commentedIn).toBe("A");
    expect(e.valueA).toBeNull();
    expect(result.counts.commentedOut).toBe(1);
    expect(result.counts.added).toBe(0);
  });

  it("ignores a bare comment header — it carries no key", () => {
    const result = run({ envA: "# Database config\nDB=1\n", envB: "DB=1\n" });
    expect(result.totalKeys).toBe(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("counts a key commented out on both sides as parity, not a difference", () => {
    const result = run({ envA: "# FEATURE_X=1\n", envB: "# FEATURE_X=2\n" });
    expect(entry(result, "FEATURE_X").status).toBe("unchanged");
    expect(entry(result, "FEATURE_X").commentedIn).toBe("both");
    expect(result.differences).toBe(0);
  });

  it("stops interpreting comments entirely when ignoreComments is off", () => {
    const result = run({
      envA: "# API_KEY=xxx\n",
      envB: "API_KEY=yyy\n",
      options: { ignoreComments: false },
    });
    expect(entry(result, "API_KEY").status).toBe("added");
    expect(result.counts.commentedOut).toBe(0);
  });
});

describe("know-how #9 — secret detection is a key-name heuristic, stated as such", () => {
  it("flags the obvious credential key names", () => {
    for (const key of ["DB_PASSWORD", "STRIPE_WEBHOOK_SECRET", "API_KEY", "JWT_SIGNING_KEY"]) {
      expect(isSecretKey(key)).toBe(true);
    }
  });

  it("accepts its known false positive and its known false negative", () => {
    // Keyword token present in a harmless key — flagged, as the brief predicts.
    expect(isSecretKey("SECRET_SANTA_NAME")).toBe(true);
    // Credential behind an innocuous name — missed, as the brief predicts.
    expect(isSecretKey("CONFIG_BLOB")).toBe(false);
    expect(isSecretKey("DATABASE_URL")).toBe(false);
  });

  it("matches per token, so a keyword inside a longer word does not count", () => {
    expect(isSecretKey("MONKEYS")).toBe(false);
    expect(isSecretKey("PASSENGER_COUNT")).toBe(false);
  });

  it("ships the caveat with the answer", () => {
    const result = run({ envA: "A=1\n", envB: "A=1\n" });
    expect(result.secretDetection.method).toBe("key-name-keyword");
    expect(result.secretDetection.note).toMatch(/not a security scanner/i);
  });
});

describe("know-how #10 — redaction must not destroy the equality signal", () => {
  it("masks both sides identically yet still reports a rotated secret", () => {
    const result = run({ envA: "DB_PASSWORD=old-value\n", envB: "DB_PASSWORD=new-value\n" });
    const e = entry(result, "DB_PASSWORD");
    expect(e.valueA).toBe(REDACTION_MASK);
    expect(e.valueB).toBe(REDACTION_MASK);
    // Display alone cannot tell these apart — the status and flag must.
    expect(e.valueA).toBe(e.valueB);
    expect(e.status).toBe("changed");
    expect(e.secretChanged).toBe(true);
    expect(result.redacted).toBe(true);
  });

  it("reports an unchanged secret as unchanged, still masked", () => {
    const result = run({ envA: "DB_PASSWORD=same\n", envB: "DB_PASSWORD=same\n" });
    const e = entry(result, "DB_PASSWORD");
    expect(e.valueA).toBe(REDACTION_MASK);
    expect(e.status).toBe("unchanged");
    expect(e.secretChanged).toBe(false);
  });

  it("marks a secret present on one side only as changed", () => {
    const result = run({ envA: "", envB: "SESSION_TOKEN=abc\n" });
    const e = entry(result, "SESSION_TOKEN");
    expect(e.status).toBe("added");
    expect(e.secretChanged).toBe(true);
    expect(e.valueA).toBeNull();
  });

  it("shows raw values when redactSecrets is off", () => {
    const result = run({
      envA: "DB_PASSWORD=old\n",
      envB: "DB_PASSWORD=new\n",
      options: { redactSecrets: false },
    });
    expect(entry(result, "DB_PASSWORD").valueA).toBe("old");
    expect(result.redacted).toBe(false);
  });

  it("omits secretChanged on non-secret keys", () => {
    const result = run({ envA: "PORT=1\n", envB: "PORT=2\n" });
    expect(entry(result, "PORT").secretChanged).toBeUndefined();
    expect(entry(result, "PORT").isSecret).toBe(false);
  });
});

describe("malformed input", () => {
  it("reports an unparsable line with its number and excludes it from the diff", () => {
    const result = run({ envA: "A=1\nthis is not an assignment\n", envB: "A=1\n" });
    const warning = result.warnings.find((w) => w.type === "unparsableLine");
    expect(warning?.file).toBe("A");
    expect(warning?.line).toBe(2);
    expect(result.totalKeys).toBe(1);
  });

  it("rejects a key that is not a valid environment variable name", () => {
    const result = run({ envA: "1BAD=x\n", envB: "" });
    expect(result.entries).toHaveLength(0);
    expect(result.warnings[0]?.type).toBe("unparsableLine");
  });

  it("parses CRLF files the same as LF files", () => {
    const result = run({ envA: "A=1\r\nB=2\r\n", envB: "A=1\nB=2\n" });
    expect(result.differences).toBe(0);
  });
});

describe("counts and totals", () => {
  it("accounts for every key exactly once", () => {
    const result = run({
      envA: "SAME=1\nDIFF=a\nONLY_A=1\n# COMMENTED=1\n",
      envB: "SAME=1\nDIFF=b\nONLY_B=1\nCOMMENTED=2\n",
    });
    const sum =
      result.counts.unchanged +
      result.counts.changed +
      result.counts.added +
      result.counts.removed +
      result.counts.commentedOut;
    expect(sum).toBe(result.totalKeys);
    expect(result.differences).toBe(result.totalKeys - result.counts.unchanged);
    expect(result.counts).toEqual({
      unchanged: 1,
      changed: 1,
      added: 1,
      removed: 1,
      commentedOut: 1,
    });
  });

  it("returns an empty, honest result for two empty files", () => {
    const result = run({ envA: "", envB: "" });
    expect(result.entries).toHaveLength(0);
    expect(result.totalKeys).toBe(0);
    expect(result.differences).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("parseEnvFile", () => {
  it("exposes the parse used by the diff, with occurrences and line numbers", () => {
    const parsed = parseEnvFile("A=1\n# B=2\nA=3\n");
    expect(parsed.active.get("A")?.value).toBe("3");
    expect(parsed.active.get("A")?.occurrences).toEqual([1, 3]);
    expect(parsed.commented.get("B")?.value).toBe("2");
  });

  it("joins a multi-line double-quoted value with newlines", () => {
    const parsed = parseEnvFile('CERT="-----BEGIN-----\nbody\n-----END-----"\nNEXT=1\n');
    expect(parsed.active.get("CERT")?.value).toBe("-----BEGIN-----\nbody\n-----END-----");
    expect(parsed.active.get("NEXT")?.value).toBe("1");
  });
});

describe("input schema", () => {
  it("fills every option default when options are omitted", () => {
    const parsed = envDiffInputSchema.parse({ envA: "A=1", envB: "A=1" });
    expect(parsed.options).toEqual({
      ignoreComments: true,
      caseInsensitiveKeys: false,
      redactSecrets: true,
    });
  });

  it("fills the missing option defaults when only one is supplied", () => {
    const parsed = envDiffInputSchema.parse({
      envA: "A=1",
      envB: "A=1",
      options: { caseInsensitiveKeys: true },
    });
    expect(parsed.options.caseInsensitiveKeys).toBe(true);
    expect(parsed.options.redactSecrets).toBe(true);
  });

  it("rejects a missing pane, a non-string pane and a non-boolean option", () => {
    expect(envDiffInputSchema.safeParse({ envA: "A=1" }).success).toBe(false);
    expect(envDiffInputSchema.safeParse({ envA: "A=1", envB: 42 }).success).toBe(false);
    expect(
      envDiffInputSchema.safeParse({ envA: "", envB: "", options: { redactSecrets: "yes" } })
        .success,
    ).toBe(false);
  });

  it("rejects a pane beyond the documented size limit", () => {
    const huge = "A=1\n".repeat(300_000);
    expect(envDiffInputSchema.safeParse({ envA: huge, envB: "" }).success).toBe(false);
  });
});

describe("diffEnv is callable directly with plain options", () => {
  it("applies the same defaults as the schema path", () => {
    const viaSchema = run({ envA: "DB_PASSWORD=x\n", envB: "DB_PASSWORD=y\n" });
    const direct = diffEnv({ envA: "DB_PASSWORD=x\n", envB: "DB_PASSWORD=y\n" });
    expect(direct).toEqual(viaSchema);
  });
});
