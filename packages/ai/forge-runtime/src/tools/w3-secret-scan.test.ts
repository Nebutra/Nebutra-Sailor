import { describe, expect, it } from "vitest";
import {
  isPlaceholderSecret,
  maskSecret,
  SECRET_RULE_IDS,
  type SecretScanInput,
  type SecretScanOutput,
  scanSecrets,
  secretRuleLabel,
  secretScanInputSchema,
  secretScanTool,
  shannonEntropy,
} from "./w3-secret-scan";

/**
 * Credential-shaped fixtures, assembled at runtime.
 *
 * These are inert, invented values — no account has ever held them. They are
 * split so that no literal in this file matches a live-credential pattern:
 * a secret scanner's test suite is the one place where realistic-looking
 * literals are guaranteed to be scanned, and a repo that cries wolf about its
 * own fixtures teaches everyone to click "allow".
 */
function credentialFixture(...parts: readonly string[]): string {
  return parts.join("");
}

const FIXTURE = {
  /** OpenAI project-key shape: prefix + body + vendor marker + tail. */
  openai: credentialFixture(
    "sk-",
    "proj-",
    "b3Kd9Lm2Qw7Ez1Rt6YuT3",
    "Blbk",
    "FJ0Pa5Sd4Fg7Hj2Kl8Zx1Cv",
  ),
  /** AWS access key id shape (AKIA + 16). */
  aws: credentialFixture("AKIA", "2E0PQ7RJ4WBK6TZL"),
  /** Stripe live-mode secret key shape. */
  stripe: credentialFixture("sk_", "live_", "51Hq7pLmNbVcXzAsDfGhJkL"),
  /** AWS's own documented example key — allowlisted by the scanner on purpose. */
  awsDocsExample: credentialFixture("AKIA", "IOSFODNN7EXAMPLE"),
} as const;

/** Parse through the real schema so defaults land exactly as they do at invoke time. */
function run(input: unknown): SecretScanOutput {
  return scanSecrets(secretScanInputSchema.parse(input) as SecretScanInput);
}

function types(out: SecretScanOutput): string[] {
  return out.findings.map((f) => f.type);
}

/*
 * Fixtures below are deliberately *shaped* like real credentials and are not
 * real credentials: every random-looking segment is deterministic filler. The
 * filler alphabets contain no 8-character repeat and no ascending run, so they
 * do not trip the placeholder suppression the engine applies (§7 rule 4) —
 * otherwise these tests would be asserting on values it is meant to drop.
 */

const FILL_ALNUM = "b3Kd9Lm2Qw7Ez1Rt6Yu0Pa5Sd4Fg7Hj8Xc";
const FILL_HEX = "b3d9f2a7e1c64d8b5e2f9a3c7d1e4068";
const FILL_UPPER = "QWFHJKLZXCVBNMRTYUIOPASDG7495162";

/** Deterministic filler of an exact length — vendor patterns are length-exact. */
function pad(prefix: string, length: number, alphabet = FILL_ALNUM): string {
  let out = prefix;
  while (out.length < length) out += alphabet;
  return out.slice(0, length);
}

const fill = (length: number) => pad("", length);
const fillHex = (length: number) => pad("", length, FILL_HEX);
const TOKEN_36 = fill(36);
const GITHUB_PAT = `ghp_${TOKEN_36}`;

describe("secret-scan — definition (ship gate §6.5)", () => {
  it("declares the ship-gate metadata", () => {
    expect(secretScanTool.id).toBe("dev/secret-scan");
    expect(secretScanTool.slug).toBe("secret-scan");
    expect(secretScanTool.category).toBe("dev");
    expect(secretScanTool.tier).toBe("core");
    expect(secretScanTool.meterId).toBe("forge.dev.secret_scan");
    expect(secretScanTool.roots).toContain("detector");
    expect(secretScanTool.engine.upstream).toContain("gitleaks");
    expect(secretScanTool.engine.upstream).toContain("Shannon");
  });

  it("is `pure` and stays that way — Detector never verifies a key upstream (§7 rule 5)", () => {
    expect(secretScanTool.sideEffect).toBe("pure");
    // The contract the brief draws hardest: no risk tier, no blast radius, no
    // liveness flag. Those belong to a checker/verifier root.
    const out = run({ text: GITHUB_PAT });
    const finding = out.findings[0] as unknown as Record<string, unknown>;
    expect(finding).toBeDefined();
    expect(finding.verified).toBeUndefined();
    expect(finding.riskTier).toBeUndefined();
    expect(finding.blastRadius).toBeUndefined();
    expect(finding.validationCommand).toBeUndefined();
  });

  it("is deterministic — same text in, identical findings out", () => {
    const text = `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMIbK7MDENGbPxRfiCYzQ8Hk3Lm9Pq\n${GITHUB_PAT}`;
    expect(JSON.stringify(run({ text }))).toBe(JSON.stringify(run({ text })));
  });

  it("ships a catalog wide enough to be worth trusting, with unique rule ids", () => {
    expect(SECRET_RULE_IDS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(SECRET_RULE_IDS).size).toBe(SECRET_RULE_IDS.length);
    expect(secretRuleLabel("aws_access_key_id")).toBe("AWS Access Key ID");
    expect(secretRuleLabel("not_a_rule")).toBeUndefined();
  });
});

describe("secret-scan — input schema", () => {
  it("applies the documented defaults", () => {
    const parsed = secretScanInputSchema.parse({ text: "hello" });
    expect(parsed.maxBytes).toBe(262_144);
    expect(parsed.maxFindings).toBe(200);
    expect(parsed.includeLowConfidence).toBe(true);
  });

  it("rejects an empty paste — there is nothing to have an opinion about", () => {
    expect(() => secretScanInputSchema.parse({ text: "" })).toThrow();
  });

  it("rejects a missing or non-string text field", () => {
    expect(() => secretScanInputSchema.parse({})).toThrow();
    expect(() => secretScanInputSchema.parse({ text: 42 })).toThrow();
  });

  it("rejects out-of-range knobs instead of silently clamping them", () => {
    expect(() => secretScanInputSchema.parse({ text: "a", maxBytes: 10 })).toThrow();
    expect(() => secretScanInputSchema.parse({ text: "a", maxBytes: 99_999_999 })).toThrow();
    expect(() => secretScanInputSchema.parse({ text: "a", maxFindings: 0 })).toThrow();
    expect(() => secretScanInputSchema.parse({ text: "a", maxFindings: 5_000 })).toThrow();
  });

  it('does not coerce the string "false" into true for includeLowConfidence', () => {
    expect(() =>
      secretScanInputSchema.parse({ text: "a", includeLowConfidence: "false" }),
    ).toThrow();
  });
});

describe("secret-scan — Shannon entropy (hand-checked)", () => {
  it("H('aabb') = 1.0 bits/char", () => {
    // Two symbols, p = 1/2 each. H = -(0.5·log2 0.5 + 0.5·log2 0.5) = -(−0.5 −0.5) = 1.
    expect(shannonEntropy("aabb")).toBeCloseTo(1, 10);
  });

  it("H('abcd') = 2.0 bits/char", () => {
    // Four symbols, p = 1/4 each. H = -4 · (0.25 · log2 0.25) = -4 · (0.25 · −2) = 2.
    expect(shannonEntropy("abcd")).toBeCloseTo(2, 10);
  });

  it("H of a single repeated symbol is 0", () => {
    // One symbol, p = 1. H = -(1 · log2 1) = 0.
    expect(shannonEntropy("aaaaaaaa")).toBe(0);
    expect(shannonEntropy("")).toBe(0);
  });
});

describe("secret-scan — masking (§9.3: masked by default)", () => {
  it("reveals nothing at all for short values", () => {
    expect(maskSecret("abc12345")).toBe("••••••••");
  });

  it("keeps a recognisable head and tail, never the middle", () => {
    const value = FIXTURE.stripe;
    const masked = maskSecret(value);
    expect(masked).toBe(`sk_liv…${value.slice(-4)}`);
    expect(masked).not.toContain(value);
  });

  it("never leaks more than 10 original characters, at any length", () => {
    for (const len of [9, 12, 20, 21, 40, 128]) {
      const value = "aB3dE7fG9hJ2kL4mN6pQ8rS0tU1vW5xY".repeat(8).slice(0, len);
      const masked = maskSecret(value);
      const revealed = masked.replace(/[•…]/g, "").length;
      expect(revealed).toBeLessThanOrEqual(10);
    }
  });

  it("returns masked values in findings, never the raw secret", () => {
    const secret = GITHUB_PAT;
    const out = run({ text: `token: ${secret}` });
    expect(out.verdict).toBe("found");
    expect(JSON.stringify(out)).not.toContain(secret);
    expect(out.findings[0]?.maskedValue).toContain("…");
    expect(out.findings[0]?.valueLength).toBe(secret.length);
  });
});

describe("secret-scan — vendor patterns (§7 rule 1a)", () => {
  const cases: Array<[string, string]> = [
    ["aws_access_key_id", FIXTURE.aws],
    ["github_pat", GITHUB_PAT],
    ["gitlab_pat", `glpat-${fill(20)}`],
    ["slack_token", `xoxb-2913847561-4827193056-${fill(24)}`],
    ["stripe_secret_key", `sk_live_51Hq7pLm${fill(20)}`],
    ["sendgrid_api_key", `SG.${fill(22)}.${fill(43)}`],
    ["google_api_key", `AIza${fill(35)}`],
    ["telegram_bot_token", `298374615:AA${fill(33)}`],
    ["huggingface_token", `hf_${fill(34)}`],
    ["npm_token", `npm_${fill(36)}`],
    ["mailgun_api_key", `key-${fillHex(32)}`],
    ["mailchimp_api_key", `${fillHex(32)}-us14`],
    ["twilio_api_key", `SK${fillHex(32)}`],
    ["databricks_token", `dapi${fillHex(32)}`],
    ["age_secret_key", `AGE-SECRET-KEY-1${pad("", 58, FILL_UPPER)}`],
    ["alibaba_access_key_id", `LTAI${fill(16)}`],
    ["tencent_secret_id", `AKID${fill(20)}`],
  ];

  for (const [type, sample] of cases) {
    it(`detects ${type}`, () => {
      const out = run({ text: `line one\nvalue = ${sample}\nline three` });
      expect(types(out)).toContain(type);
      const finding = out.findings.find((f) => f.type === type);
      expect(finding?.line).toBe(2);
      expect(finding?.reason.length).toBeGreaterThan(10);
    });
  }

  it("flags a PEM private-key header as a marker, shown verbatim rather than masked", () => {
    const out = run({ text: "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n" });
    const finding = out.findings.find((f) => f.type === "private_key_block");
    expect(finding?.confidence).toBe("high");
    // The header itself carries no secret material, so masking it would only
    // make the finding harder to act on.
    expect(finding?.maskedValue).toBe("-----BEGIN RSA PRIVATE KEY-----");
  });

  it("flags a password embedded in a connection URL, not the username", () => {
    const out = run({
      text: "DATABASE_URL=postgres://svcuser:Tr0ub4dor3Kd9Lm2@db.internal:5432/app",
    });
    const finding = out.findings.find((f) => f.type === "connection_string_password");
    expect(finding?.confidence).toBe("high");
    expect(JSON.stringify(out)).not.toContain("Tr0ub4dor3Kd9Lm2");
  });

  it("reports line and column so the user can go redact it (§7 rule 8)", () => {
    const out = run({ text: `one\ntwo\nkey = ${FIXTURE.aws}` });
    const finding = out.findings.find((f) => f.type === "aws_access_key_id");
    expect(finding?.line).toBe(3);
    expect(finding?.column).toBe(7); // "key = " is 6 characters, so the match starts at column 7.
  });
});

describe("secret-scan — non-secrets stay quiet", () => {
  it("does not flag Stripe publishable keys — they are designed to ship publicly", () => {
    const out = run({ text: "const pk = 'pk_live_51Hq7pLmNbVcXzAsDfGhJkL';" });
    expect(out.verdict).toBe("clean");
  });

  it("returns a clean verdict for ordinary prose", () => {
    const out = run({ text: "The quick brown fox jumps over the lazy dog.\nNothing to see here." });
    expect(out.verdict).toBe("clean");
    expect(out.findingCount).toBe(0);
    expect(out.findings).toEqual([]);
  });

  it("finds nothing structured in binary-ish garbage rather than erroring (§9.1 step 6)", () => {
    const out = run({ text: "ÿþ binary junk " });
    expect(out.verdict).toBe("clean");
  });

  it("marks a test-mode Stripe key as low confidence, not high", () => {
    const out = run({ text: "STRIPE_KEY=sk_test_51Hq7pLmNbVcXzAsDfGhJkL" });
    const finding = out.findings.find((f) => f.type === "stripe_test_secret_key");
    expect(finding?.confidence).toBe("low");
  });
});

describe("secret-scan — entropy plus context (§7 rules 1b and 2)", () => {
  const blob = "wJalrXUtnFEMIbK7MDENGbPxRfiCYzQ8Hk3Lm9Pq";

  it("the same blob is a credential next to a secret-named variable…", () => {
    const out = run({ text: `AWS_SECRET_ACCESS_KEY = "${blob}"` });
    expect(out.verdict).toBe("found");
    const finding = out.findings[0];
    expect(finding?.confidence).toBe("high");
    expect(finding?.contextKey ?? finding?.reason).toBeTruthy();
    expect(finding?.reason).toMatch(/aws_secret_access_key|entropy/i);
  });

  it("…and only a low-confidence note under a name that does not read as a credential", () => {
    const out = run({ text: `translationChecksum = "${blob}"` });
    expect(out.findings.every((f) => f.confidence === "low")).toBe(true);
    expect(types(out)).toContain("generic_high_entropy");
  });

  it("drops the low-confidence noise entirely when the caller asks for a quiet gate", () => {
    const out = run({ text: `translationChecksum = "${blob}"`, includeLowConfidence: false });
    expect(out.verdict).toBe("clean");
    expect(out.counts.low).toBe(0);
  });

  it("reports the entropy it used, so the verdict is arguable rather than magic", () => {
    const out = run({ text: `API_SECRET = "${blob}"` });
    const finding = out.findings[0];
    expect(finding?.entropy).toBeGreaterThan(3.5);
    expect(finding?.contextKey).toBe("API_SECRET");
  });

  it("flags a literal hard-coded password even though its entropy is low", () => {
    const out = run({ text: "db_password = 'hunter2hunter2'" });
    const finding = out.findings.find((f) => f.type === "hardcoded_password");
    expect(finding?.confidence).toBe("low");
    expect(finding?.contextKey).toBe("db_password");
  });

  it("ignores a low-entropy value under a non-credential name", () => {
    const out = run({ text: "display_name = 'the quick brown fox'" });
    expect(out.verdict).toBe("clean");
  });
});

describe("secret-scan — ranked candidates, never a forced guess (§7 rule 3)", () => {
  it("an sk- key with no vendor marker reports candidates instead of one guess", () => {
    const out = run({ text: "LLM_KEY=sk-b3Kd9Lm2Qw7Ez1Rt6Yu0Pa5Sd4Fg7Hj2Kl8Zx1Cv6Bn3Mq" });
    const finding = out.findings.find((f) => f.type === "generic_sk_key");
    expect(finding).toBeDefined();
    expect(finding?.candidates).toContain("openai_api_key");
    expect(finding?.candidates).toContain("anthropic_api_key");
    expect(finding?.candidates?.length ?? 0).toBeGreaterThan(2);
  });

  it("but a vendor marker wins outright — OpenAI's key is not reported as ambiguous", () => {
    const key = FIXTURE.openai;
    const out = run({ text: `OPENAI_API_KEY=${key}` });
    expect(out.findings[0]?.type).toBe("openai_api_key");
    // The generic sk- rule matched the same span; it is demoted, not duplicated.
    expect(out.findings.filter((f) => f.line === 1).length).toBe(1);
    expect(out.findings[0]?.candidates).toContain("generic_sk_key");
  });

  it("a bare 32-hex secret lists the vendors that share the shape", () => {
    const out = run({ text: "API_KEY = b3d9f2a7e1c64d8b5e2f9a3c7d1e4068" });
    const finding = out.findings[0];
    expect(finding?.candidates).toContain("mailgun_api_key");
    expect(finding?.candidates).toContain("generic_md5_hex");
  });
});

describe("secret-scan — placeholder suppression (§7 rule 4)", () => {
  const placeholders = [
    FIXTURE.awsDocsExample,
    "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    `ghp_${pad("YourApiKeyHere", 36)}`,
    `AIza${pad("YourApiKeyHere", 35)}`,
  ];

  for (const value of placeholders) {
    it(`suppresses the demo value ${value.slice(0, 14)}…`, () => {
      const out = run({ text: `API_KEY=${value}` });
      expect(out.verdict).toBe("clean");
      expect(out.suppressedCount).toBeGreaterThan(0);
    });
  }

  it("classifies repeated, sequential and near-zero-entropy runs as placeholders", () => {
    expect(isPlaceholderSecret("aaaaaaaaaaaaaaaa")).toBe(true);
    expect(isPlaceholderSecret("abcdefghijKLMNOP")).toBe(true);
    expect(isPlaceholderSecret("0123456789012345")).toBe(true);
    expect(isPlaceholderSecret("your-api-key-here")).toBe(true);
    expect(isPlaceholderSecret("CHANGEME_before_deploy")).toBe(true);
  });

  it("does not classify a real-shaped random key as a placeholder", () => {
    expect(isPlaceholderSecret("b3Kd9Lm2Qw7Ez1Rt6Yu0Pa5Sd4Fg7Hj2")).toBe(false);
  });

  it("a .env.example file full of placeholders comes back clean, with a count", () => {
    const out = run({
      text: [
        "# .env.example",
        `AWS_ACCESS_KEY_ID=${FIXTURE.awsDocsExample}`,
        "OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "DB_PASSWORD=changeme",
      ].join("\n"),
    });
    expect(out.verdict).toBe("clean");
    expect(out.suppressedCount).toBeGreaterThanOrEqual(2);
  });
});

describe("secret-scan — result shape and ordering", () => {
  it("sorts high confidence first, then by position", () => {
    const out = run({
      text: [
        "notes = 'nothing here'",
        "checksum = wJalrXUtnFEMIbK7MDENGbPxRfiCYzQ8Hk3Lm9Pq",
        `AWS_KEY = ${FIXTURE.aws}`,
      ].join("\n"),
    });
    expect(out.findings[0]?.confidence).toBe("high");
    const ranks = out.findings.map((f) => ({ high: 3, medium: 2, low: 1 })[f.confidence]);
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks);
  });

  it("counts by confidence and agrees with findingCount", () => {
    const out = run({
      text: `GITHUB_TOKEN=${GITHUB_PAT}\nSTRIPE=sk_test_51Hq7pLmNbVcXzAsDfGhJkL`,
    });
    expect(out.counts.high + out.counts.medium + out.counts.low).toBe(out.findingCount);
    expect(out.findingCount).toBe(out.findings.length);
  });

  it("caps the findings list and reports how many it dropped", () => {
    const line = `TOKEN_%i%=${GITHUB_PAT}`;
    const text = Array.from({ length: 12 }, (_, i) => line.replace("%i%", String(i))).join("\n");
    const out = run({ text, maxFindings: 5 });
    expect(out.findings.length).toBe(5);
    expect(out.omittedCount).toBe(7);
  });
});

describe("secret-scan — large input behaviour (§7 rule 7)", () => {
  it("caps at maxBytes and says so instead of silently scanning half the paste", () => {
    const filler = "x".repeat(4_000);
    const out = run({ text: `${filler}\n${GITHUB_PAT}`, maxBytes: 2_048 });
    expect(out.truncated).toBe(true);
    expect(out.scannedBytes).toBeLessThanOrEqual(2_048);
    // The token lived past the cap, so the honest answer is "not seen".
    expect(types(out)).not.toContain("github_pat");
  });

  it("does not mark a paste under the cap as truncated", () => {
    const out = run({ text: `GITHUB_TOKEN=${GITHUB_PAT}` });
    expect(out.truncated).toBe(false);
    expect(out.lineCount).toBe(1);
  });

  it("survives a cut multi-byte character at the byte cap", () => {
    // "中" is three UTF-8 bytes; cutting at 1025 bytes lands mid-character.
    const out = run({ text: "中".repeat(1_000), maxBytes: 1_025 });
    expect(out.truncated).toBe(true);
    expect(out.verdict).toBe("clean");
  });

  it("stays fast on a large realistic paste", () => {
    const chunk = "export const value = 'plain configuration line';\n";
    const text = `${chunk.repeat(4_000)}API_TOKEN=${GITHUB_PAT}\n`;
    const out = run({ text });
    expect(types(out)).toContain("github_pat");
  });
});

describe("secret-scan — tool.execute matches the pure engine", () => {
  it("runs through the registered tool definition", async () => {
    const input = secretScanInputSchema.parse({
      text: `AWS_ACCESS_KEY_ID=${FIXTURE.aws}`,
    });
    const viaTool = (await secretScanTool.execute(input)) as SecretScanOutput;
    expect(viaTool.verdict).toBe("found");
    expect(JSON.stringify(viaTool)).toBe(JSON.stringify(scanSecrets(input as SecretScanInput)));
  });
});

describe("secret-scan — the position must point at the secret, not near it", () => {
  it("columns the captured group, not the first place its text appears", () => {
    // The user and the password are the same string. Searching the whole match
    // for the captured value lands on the username; the user then redacts the
    // wrong characters and leaves the credential in place.
    const line = "DATABASE_URL=postgres://hunter2xy:hunter2xy@db.example.com:5432/app";
    const out = run({ text: `${line}\n` });
    const finding = out.findings.find((f) => f.type === "connection_string_password");
    expect(finding).toBeDefined();
    expect(finding?.line).toBe(1);
    // 1-based column of the second "hunter2xy".
    expect(finding?.column).toBe(line.lastIndexOf("hunter2xy") + 1);
  });

  it("columns a trailing capture correctly too", () => {
    const line = 'aws_secret_access_key = "wJalrXUtnFEMIK7MDENGbPxRfiCYzQ3vLm9pT4Ns"';
    const out = run({ text: `# header\n${line}\n` });
    const finding = out.findings.find((f) => f.type === "aws_secret_access_key");
    expect(finding?.line).toBe(2);
    expect(finding?.column).toBe(line.indexOf("wJalr") + 1);
  });

  it("only offers candidate ids this catalog can name", () => {
    // A candidate the caller cannot resolve to a label renders as a raw id.
    for (const id of SECRET_RULE_IDS) {
      expect(secretRuleLabel(id), id).toBeTruthy();
    }
    const out = run({ text: "PROVIDER_KEY=sk-abcdefghijklmnop0123456789" });
    for (const candidate of out.findings.flatMap((f) => f.candidates ?? [])) {
      if (candidate.startsWith("generic_")) continue; // shape names, not rules
      expect(secretRuleLabel(candidate), candidate).toBeTruthy();
    }
  });
});
