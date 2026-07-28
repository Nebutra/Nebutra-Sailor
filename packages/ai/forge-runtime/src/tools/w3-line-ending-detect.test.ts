import { describe, expect, it } from "vitest";
import {
  type LineEndingDetectResult,
  lineEndingDetectTool,
  summarizeLineEndings,
  w3LineEndingDetectTools,
} from "./w3-line-ending-detect";

function run(input: unknown): LineEndingDetectResult {
  const parsed = lineEndingDetectTool.inputSchema.parse(input);
  return lineEndingDetectTool.execute(parsed) as LineEndingDetectResult;
}

function fromBytes(bytes: number[], extra: Record<string, unknown> = {}): LineEndingDetectResult {
  return run({ fileBase64: Buffer.from(Uint8Array.from(bytes)).toString("base64"), ...extra });
}

function code(result: LineEndingDetectResult, wanted: string) {
  return result.findings.find((f) => f.code === wanted);
}

describe("line-ending-detect · declaration", () => {
  it("declares the Detector-root contract the brief fixes", () => {
    expect(lineEndingDetectTool.id).toBe("text/line-ending-detect");
    expect(lineEndingDetectTool.slug).toBe("line-ending-detect");
    expect(lineEndingDetectTool.meterId).toBe("forge.text.line_ending_detect");
    expect(lineEndingDetectTool.sideEffect).toBe("pure");
    expect(lineEndingDetectTool.roots).toContain("detector");
    expect(lineEndingDetectTool.title.zh).not.toBe(lineEndingDetectTool.title.en);
    expect(lineEndingDetectTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(lineEndingDetectTool.seoKeywords.en.length).toBeGreaterThan(0);
    // Engine metadata names the specs implemented, not an imaginary library.
    expect(lineEndingDetectTool.engine.upstream).toContain("1003.1-2017");
    expect(lineEndingDetectTool.engine.upstream).toContain("RFC 3629");
    expect(w3LineEndingDetectTools).toEqual([lineEndingDetectTool]);
  });

  it("is deterministic: the same input yields a byte-identical result", () => {
    const input = { text: "a\r\nb\nc" };
    expect(JSON.stringify(run(input))).toBe(JSON.stringify(run(input)));
  });
});

describe("line-ending-detect · schema", () => {
  it("rejects an empty object (neither text nor fileBase64)", () => {
    expect(lineEndingDetectTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects both inputs at once — one authoritative source only", () => {
    const parsed = lineEndingDetectTool.inputSchema.safeParse({ text: "a\n", fileBase64: "YQo=" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-string text and a sampleBytes below the floor", () => {
    expect(lineEndingDetectTool.inputSchema.safeParse({ text: 42 }).success).toBe(false);
    expect(
      lineEndingDetectTool.inputSchema.safeParse({ text: "a\n", sampleBytes: 4 }).success,
    ).toBe(false);
    expect(
      lineEndingDetectTool.inputSchema.safeParse({ text: "a\n", sampleBytes: 9_000_000 }).success,
    ).toBe(false);
  });

  it("defaults sampleBytes to the 256 KiB detection window", () => {
    const parsed = lineEndingDetectTool.inputSchema.parse({ text: "a\n" });
    expect(parsed.sampleBytes).toBe(262_144);
  });

  it("accepts empty text — an empty file is a legitimate question", () => {
    const result = run({ text: "" });
    expect(result.dominant).toBe("none");
    expect(result.totalLines).toBe(0);
    expect(code(result, "empty")).toBeDefined();
  });
});

describe("line-ending-detect · counting (Unicode 15.0 §5.8 newline guidelines)", () => {
  it("counts pure LF and calls it consistent", () => {
    // "a\nb\nc\n" → three LF terminators, three complete lines.
    const result = run({ text: "a\nb\nc\n" });
    expect(result.counts).toEqual({ lf: 3, crlf: 0, cr: 0 });
    expect(result.dominant).toBe("LF");
    expect(result.isMixed).toBe(false);
    expect(result.totalLines).toBe(3);
    expect(result.trailingNewline).toBe("present");
    expect(summarizeLineEndings(result)).toContain("consistent");
  });

  it("counts CRLF as one terminator, never as CR plus LF", () => {
    const result = run({ text: "a\r\nb\r\n" });
    expect(result.counts).toEqual({ lf: 0, crlf: 2, cr: 0 });
    expect(result.isMixed).toBe(false);
    expect(result.dominant).toBe("CRLF");
    // 2 CRLF terminators over 6 bytes: a CR LF b CR LF.
    expect(result.byteSize).toBe(6);
  });

  it("counts a lone CR as a classic Mac terminator and warns", () => {
    const result = run({ text: "a\rb\rc\r" });
    expect(result.counts).toEqual({ lf: 0, crlf: 0, cr: 3 });
    expect(result.dominant).toBe("CR");
    expect(result.isMixed).toBe(false);
    expect(code(result, "cr_only")?.level).toBe("warning");
  });

  it("distinguishes CR-then-LF-then-CR sequences byte by byte", () => {
    // "\r\n\r" → one CRLF then one lone CR: 2 terminators, 2 lines, ends on one.
    const result = run({ text: "\r\n\r" });
    expect(result.counts).toEqual({ lf: 0, crlf: 1, cr: 1 });
    expect(result.totalLines).toBe(2);
    expect(result.trailingNewline).toBe("present");
  });

  it("treats a file with no terminator at all as one unterminated line", () => {
    const result = run({ text: "no newline here" });
    expect(result.dominant).toBe("none");
    expect(result.isMixed).toBe(false);
    expect(result.totalLines).toBe(1);
    expect(result.trailingNewline).toBe("absent");
    expect(result.ratios).toEqual({ lf: 0, crlf: 0, cr: 0 });
  });
});

describe("line-ending-detect · know-how #1: mixed is not a boolean", () => {
  it("reports per-style counts and ratios that sum to 1", () => {
    // 3 LF + 1 CRLF = 4 terminators → 0.75 / 0.25.
    const result = run({ text: "a\nb\nc\nd\r\n" });
    expect(result.counts).toEqual({ lf: 3, crlf: 1, cr: 0 });
    expect(result.ratios.lf).toBeCloseTo(0.75, 10);
    expect(result.ratios.crlf).toBeCloseTo(0.25, 10);
    expect(result.ratios.lf + result.ratios.crlf + result.ratios.cr).toBeCloseTo(1, 10);
    expect(result.isMixed).toBe(true);
    expect(result.dominant).toBe("LF");
    expect(summarizeLineEndings(result)).toContain("MIXED");
  });

  it("names the stray lines so a rare outlier is actionable, not just alarming", () => {
    // 99 LF lines with one CRLF planted as the terminator of line 50.
    const lines = Array.from({ length: 100 }, (_, i) => `line${i + 1}`);
    const text = lines.map((l, i) => `${l}${i === 49 ? "\r\n" : "\n"}`).join("");
    const result = run({ text });
    expect(result.counts).toEqual({ lf: 99, crlf: 1, cr: 0 });
    expect(result.dominant).toBe("LF");
    expect(result.minorityLines).toEqual([50]);
    expect(result.minorityLinesTruncated).toBe(false);
    // 1/100 = 1% < 5% → the outlier finding, not just the generic mixed one.
    expect(code(result, "mixed_outlier")?.message).toContain("50");
  });

  it("caps the named lines at 20 and says so", () => {
    // 40 CRLF strays inside 400 LF lines: minority share 40/440 ≈ 9% (> 5%),
    // so no outlier finding, but the line list is still capped.
    const parts: string[] = [];
    for (let i = 0; i < 440; i += 1) parts.push(i % 11 === 0 ? "x\r\n" : "x\n");
    const result = run({ text: parts.join("") });
    expect(result.counts.crlf).toBe(40);
    expect(result.minorityLines).toHaveLength(20);
    expect(result.minorityLinesTruncated).toBe(true);
    expect(code(result, "mixed_outlier")).toBeUndefined();
    expect(code(result, "mixed")).toBeDefined();
  });

  it("breaks a dominance tie deterministically (LF > CRLF > CR)", () => {
    const result = run({ text: "a\nb\r\n" });
    expect(result.counts).toEqual({ lf: 1, crlf: 1, cr: 0 });
    expect(result.dominant).toBe("LF");
    expect(result.isMixed).toBe(true);
  });
});

describe("line-ending-detect · know-how #2: trailing newline is its own axis", () => {
  it("flags a consistent file that still lacks its final newline", () => {
    const result = run({ text: "a\nb\nc" });
    expect(result.isMixed).toBe(false);
    expect(result.dominant).toBe("LF");
    // 2 terminators + 1 dangling line "c".
    expect(result.totalLines).toBe(3);
    expect(result.trailingNewline).toBe("absent");
    expect(code(result, "no_trailing_newline")?.level).toBe("warning");
  });

  it("does not flag a file that ends on its terminator", () => {
    const result = run({ text: "a\nb\n" });
    expect(result.trailingNewline).toBe("present");
    expect(code(result, "no_trailing_newline")).toBeUndefined();
  });
});

describe("line-ending-detect · know-how #3: UTF-8 BOM travels with this question", () => {
  it("detects EF BB BF and keeps it out of the line count", () => {
    // EF BB BF | 'a' | LF  → BOM + one LF-terminated line.
    const result = fromBytes([0xef, 0xbb, 0xbf, 0x61, 0x0a]);
    expect(result.bom).toBe("utf8");
    expect(result.counts).toEqual({ lf: 1, crlf: 0, cr: 0 });
    expect(result.totalLines).toBe(1);
    expect(result.byteSize).toBe(5);
    expect(code(result, "bom_present")?.level).toBe("warning");
  });

  it("escalates when the BOM sits in front of a shebang", () => {
    // EF BB BF | '#' '!' '/' 'b' 'i' 'n' '/' 's' 'h' | LF
    const result = fromBytes([
      0xef, 0xbb, 0xbf, 0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x73, 0x68, 0x0a,
    ]);
    expect(code(result, "bom_before_shebang")?.level).toBe("danger");
    expect(code(result, "bom_present")).toBeUndefined();
  });

  it("reports no BOM for plain ASCII", () => {
    const result = run({ text: "#!/bin/sh\n" });
    expect(result.bom).toBe("none");
  });
});

describe("line-ending-detect · shebang damage (the §1 JTBD failure)", () => {
  it("raises a danger finding when the shebang line ends with CRLF", () => {
    const result = run({ text: "#!/bin/bash\r\necho hi\r\n" });
    expect(code(result, "shebang_cr")?.level).toBe("danger");
    expect(code(result, "shebang_cr")?.message).toContain("CRLF");
  });

  it("raises it for a lone CR too", () => {
    const result = run({ text: "#!/bin/bash\recho hi\r" });
    expect(code(result, "shebang_cr")?.message).toContain("CR");
  });

  it("stays quiet for an LF-terminated shebang", () => {
    const result = run({ text: "#!/bin/bash\necho hi\n" });
    expect(code(result, "shebang_cr")).toBeUndefined();
  });

  it("stays quiet when CRLF appears in a file that is not a script", () => {
    const result = run({ text: "name,value\r\na,1\r\n" });
    expect(code(result, "shebang_cr")).toBeUndefined();
  });
});

describe("line-ending-detect · know-how #4: bytes, not a textarea round-trip", () => {
  it("attaches the normalisation caveat to the text path only", () => {
    expect(code(run({ text: "a\n" }), "text_input_caveat")).toBeDefined();
    expect(run({ text: "a\n" }).source).toBe("text");
    const file = fromBytes([0x61, 0x0a]);
    expect(file.source).toBe("file");
    expect(code(file, "text_input_caveat")).toBeUndefined();
  });

  it("accepts a data: URL prefixed base64 payload", () => {
    const b64 = Buffer.from("a\r\n").toString("base64");
    const result = run({ fileBase64: `data:text/plain;base64,${b64}` });
    expect(result.counts).toEqual({ lf: 0, crlf: 1, cr: 0 });
  });

  it("counts the same terminators from bytes as from the equivalent string", () => {
    const text = "a\r\nb\nc\rd";
    const viaText = run({ text });
    const viaBytes = run({ fileBase64: Buffer.from(text, "utf8").toString("base64") });
    expect(viaBytes.counts).toEqual(viaText.counts);
    expect(viaBytes.totalLines).toBe(viaText.totalLines);
  });
});

describe("line-ending-detect · know-how #5: only UTF-8/ASCII is safe to scan", () => {
  it("warns on a UTF-16LE BOM instead of emitting a confident count", () => {
    // FF FE | 'a' 00 | 0D 00 0A 00  — UTF-16LE "a\r\n"
    const result = fromBytes([0xff, 0xfe, 0x61, 0x00, 0x0d, 0x00, 0x0a, 0x00]);
    expect(result.decodeWarning).toContain("UTF-16");
    expect(result.bom).toBe("none");
    expect(code(result, "decode")).toBeDefined();
  });

  it("warns on a UTF-32LE BOM", () => {
    const result = fromBytes([0xff, 0xfe, 0x00, 0x00, 0x61, 0x00, 0x00, 0x00]);
    expect(result.decodeWarning).toContain("UTF-32");
  });

  it("warns when NUL bytes appear without any BOM", () => {
    const result = fromBytes([0x61, 0x00, 0x0a, 0x00]);
    expect(result.decodeWarning).toContain("NUL");
  });

  it("warns on malformed UTF-8 (a bare 0x80 continuation byte)", () => {
    const result = fromBytes([0x61, 0x80, 0x0a]);
    expect(result.decodeWarning).toContain("UTF-8");
  });

  it("stays silent for well-formed multi-byte UTF-8", () => {
    const result = run({ text: "中文\n日本語\n" });
    expect(result.decodeWarning).toBeUndefined();
    expect(result.counts).toEqual({ lf: 2, crlf: 0, cr: 0 });
    // 中文 = 6 bytes, 日本語 = 9 bytes, plus two LF = 17 bytes.
    expect(result.byteSize).toBe(17);
  });

  it("does not report a truncated multi-byte tail as malformed", () => {
    // 1 (LF) + 14 ('a') + 3 ("中" = E4 B8 AD) = 18 bytes; a 16-byte window
    // stops one byte into the three-byte sequence.
    const bytes = Array.from(Buffer.from(`\n${"a".repeat(14)}中`, "utf8"));
    expect(bytes).toHaveLength(18);
    const result = fromBytes(bytes, { sampleBytes: 64 });
    expect(result.decodeWarning).toBeUndefined();
    const cut = fromBytes(bytes, { sampleBytes: 16 });
    expect(cut.sampled).toBe(true);
    expect(cut.decodeWarning).toBeUndefined();
    expect(code(cut, "sampled")).toBeDefined();
  });
});

describe("line-ending-detect · sampling", () => {
  it("scans only the window and reports the real source size", () => {
    const text = "x\n".repeat(1000);
    const result = run({ text, sampleBytes: 20 });
    expect(result.sampled).toBe(true);
    expect(result.byteSize).toBe(20);
    expect(result.sourceBytes).toBe(2000);
    expect(result.counts.lf).toBe(10);
  });

  it("marks nothing as sampled when the input fits the window", () => {
    const result = run({ text: "x\n", sampleBytes: 64 });
    expect(result.sampled).toBe(false);
    expect(result.byteSize).toBe(result.sourceBytes);
    expect(code(result, "sampled")).toBeUndefined();
  });
});
