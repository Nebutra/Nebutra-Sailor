import { describe, expect, it } from "vitest";
import {
  buildCategoryHub,
  buildRootHub,
  buildToolPageModel,
  compressPdfBuffer,
  countText,
  createForgeMcpHandlers,
  ForgeRegistry,
  invokeTool,
} from "./index";
import { markdownToSimplePdf } from "./tools/md-to-pdf";

describe("countText", () => {
  it("counts CJK and latin words", () => {
    const result = countText("你好 world");
    expect(result.cjkCharacters).toBe(2);
    // Segmenter may treat CJK runs as one or more word-like units depending on locale
    expect(result.words).toBeGreaterThanOrEqual(2);
    expect(result.engine).toMatch(/Segmenter|fallback/);
    expect(result.characters).toBeGreaterThan(0);
  });
});

describe("ForgeRegistry", () => {
  it("lists full registry (≥143 with W5 gaps) with roots on every tool", () => {
    const registry = ForgeRegistry.openDefault();
    const tools = registry.list();
    expect(tools.length).toBeGreaterThanOrEqual(143);
    // W1: every tool gets demand roots (explicit or defaults map)
    expect(tools.every((t) => Array.isArray(t.roots) && (t.roots?.length ?? 0) > 0)).toBe(true);
    expect(registry.get("word-count").roots).toContain("analyzer");
    expect(registry.get("base64").roots).toContain("converter");
    expect(registry.get("word-count").id).toBe("text/word-count");
    expect(registry.get("zh-cn-tw").id).toBe("text/zh-cn-tw");
    expect(registry.get("cost-estimate").id).toBe("llm/cost-estimate");
    expect(registry.get("qr-generate").id).toBe("image/qr-generate");
    expect(registry.get("json-yaml").id).toBe("data/json-yaml");
    expect(registry.get("pdf-merge").id).toBe("doc/pdf-merge");
    expect(registry.search("json").some((t) => t.slug === "json-format")).toBe(true);
    expect(registry.categories()).toContain("text");
    expect(registry.categories()).toContain("unit");
    expect(registry.categories()).toContain("cn");
  });
});

describe("invokeTool", () => {
  const registry = ForgeRegistry.openDefault();

  it("invokes word-count successfully", async () => {
    const result = await invokeTool(registry, {
      toolId: "text/word-count",
      input: { text: "hello world" },
      requestId: "req_test",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toMatchObject({ words: 2 });
      expect(result.meterId).toBe("forge.text.word_count");
      expect(result.requestId).toBe("req_test");
    }
  });

  it("returns invalid_input for bad payload", async () => {
    const result = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: 123 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_input");
    }
  });

  it("returns tool_not_found", async () => {
    const result = await invokeTool(registry, {
      toolId: "no/such-tool",
      input: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("tool_not_found");
    }
  });

  it("formats valid json", async () => {
    const result = await invokeTool(registry, {
      toolId: "json-format",
      input: { text: '{"a":1}', mode: "format", indent: 2 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(String((result.output as { result: string }).result)).toContain('"a"');
    }
  });
});

describe("buildToolPageModel", () => {
  it("builds dual-surface page model for human template", () => {
    const registry = ForgeRegistry.openDefault();
    const page = buildToolPageModel(registry, "base64");
    expect(page.path).toBe("/t/base64");
    expect(page.api.path).toContain("/v1/tools/");
    expect(page.api.exampleCurl).toContain("curl");
    expect(page.seo.title.zh).toContain("Base64");
    expect(page.engine.name).toBeTruthy();
  });

  it("builds category hub for home IA", () => {
    const hub = buildCategoryHub(ForgeRegistry.openDefault());
    expect(hub.categories.length).toBeGreaterThan(0);
    expect(hub.tools.length).toBeGreaterThanOrEqual(8);
  });
});

describe("md-to-pdf + mcp", () => {
  it("writes a valid PDF header via marked simple path", () => {
    const pdf = markdownToSimplePdf("# Hello\n\n**world**\n\n- a\n- b", "Test");
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("renderMarkdownPdf simple engine returns PDF and marks simple render", async () => {
    const { renderMarkdownPdf } = await import("./tools/md-to-pdf.js");
    const out = await renderMarkdownPdf({
      markdown: "# Title\n\nHello **PDF**",
      title: "T",
      engine: "simple",
    });
    expect(out.renderEngine).toBe("simple");
    expect(out.buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("keeps md-to-pdf off the default registry (host registers via /pdf subpath)", async () => {
    const registry = ForgeRegistry.openDefault();
    expect(registry.list().some((t) => t.id === "doc/md-to-pdf")).toBe(false);
    const missing = await invokeTool(registry, {
      toolId: "doc/md-to-pdf",
      input: { markdown: "# x", title: "Doc", engine: "simple" },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.code).toBe("tool_not_found");
    }

    // Hosts that need Playwright PDF import the tool from the optional subpath
    // and register it explicitly — see tools/index.ts F0_BATCH1_TOOLS comment.
    const { mdToPdfTool } = await import("./tools/md-to-pdf.js");
    const { F0_BATCH1_TOOLS } = await import("./tools/index.js");
    const withPdf = new ForgeRegistry([...F0_BATCH1_TOOLS, mdToPdfTool]);
    const result = await invokeTool(withPdf, {
      toolId: "doc/md-to-pdf",
      input: {
        markdown: "# SOTA path\n\n- item",
        title: "Doc",
        engine: "simple",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.output as {
        renderEngine: string;
        base64: string;
      };
      expect(output.renderEngine).toBe("simple");
      expect(Buffer.from(output.base64, "base64").subarray(0, 5).toString("utf8")).toBe("%PDF-");
    }
  });

  it("diffs with jsdiff engine", async () => {
    const registry = ForgeRegistry.openDefault();
    const result = await invokeTool(registry, {
      toolId: "text/diff",
      input: { left: "a\nb", right: "a\nc" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(String((result.output as { engine: string }).engine)).toBe("diff");
    }
  });

  it("lists and calls MCP-shaped tools", async () => {
    const registry = ForgeRegistry.openDefault();
    const mcp = createForgeMcpHandlers(registry);
    const tools = mcp.listTools();
    expect(tools.some((t) => t.name === "text__word-count")).toBe(true);
    const result = await mcp.callTool("text__word-count", { text: "a b" });
    expect(result.isError).toBeFalsy();
    expect(result.content[0]?.text).toContain("words");
  });

  it("ships W2 demand tools with roots (generator/checker/optimizer)", async () => {
    const registry = ForgeRegistry.openDefault();
    for (const slug of [
      "lorem-ipsum",
      "email-validate",
      "credit-card-luhn",
      "json-minify",
      "css-minify",
      "hash-compare",
    ]) {
      expect(registry.has(slug)).toBe(true);
    }
    const lorem = await invokeTool(registry, {
      toolId: "text/lorem-ipsum",
      input: { paragraphs: 1, wordsPerParagraph: 12, startWithLorem: true },
    });
    expect(lorem.ok).toBe(true);
    if (lorem.ok) {
      expect(String((lorem.output as { text: string }).text)).toMatch(/^Lorem ipsum/i);
    }
    const email = await invokeTool(registry, {
      toolId: "text/email-validate",
      input: { text: "good@nebutra.com\nbad@@x\n" },
    });
    expect(email.ok).toBe(true);
    if (email.ok) {
      const out = email.output as { validCount: number; invalidCount: number };
      expect(out.validCount).toBe(1);
      expect(out.invalidCount).toBe(1);
    }
    // Visa test number 4111111111111111 is Luhn-valid
    const card = await invokeTool(registry, {
      toolId: "finance/credit-card-luhn",
      input: { number: "4111 1111 1111 1111" },
    });
    expect(card.ok).toBe(true);
    if (card.ok) {
      expect((card.output as { valid: boolean }).valid).toBe(true);
      expect((card.output as { brand: string }).brand).toBe("visa");
    }
    const cmp = await invokeTool(registry, {
      toolId: "hash/hash-compare",
      input: { a: "AbC", b: "abc", ignoreCase: true },
    });
    expect(cmp.ok).toBe(true);
    if (cmp.ok) {
      expect((cmp.output as { equal: boolean }).equal).toBe(true);
    }
    expect(registry.get("lorem-ipsum").roots).toContain("generator");
    expect(registry.get("email-validate").roots).toContain("checker");
  });

  it("ships W2b matrix tools (diff / format / validate / reading-time)", async () => {
    const registry = ForgeRegistry.openDefault();
    for (const slug of [
      "json-diff",
      "yaml-format",
      "toml-format",
      "xml-minify",
      "url-validate",
      "ip-validate",
      "uuid-validate",
      "html-minify",
      "random-string",
      "reading-time",
      "markdown-toc",
      "pdf-info",
    ]) {
      expect(registry.has(slug)).toBe(true);
    }

    const diff = await invokeTool(registry, {
      toolId: "data/json-diff",
      input: { left: '{"a":1}', right: '{"a":2,"b":3}' },
    });
    expect(diff.ok).toBe(true);
    if (diff.ok) {
      expect((diff.output as { equal: boolean }).equal).toBe(false);
      expect((diff.output as { changeCount: number }).changeCount).toBeGreaterThan(0);
    }

    const yamlFmt = await invokeTool(registry, {
      toolId: "data/yaml-format",
      input: { text: "foo: 1\nbar: [a, b]\n", mode: "pretty", indent: 2 },
    });
    expect(yamlFmt.ok).toBe(true);
    if (yamlFmt.ok) {
      expect(String((yamlFmt.output as { result: string }).result)).toContain("foo:");
    }

    const url = await invokeTool(registry, {
      toolId: "dev/url-validate",
      input: { text: "https://nebutra.com/path\nnot a url" },
    });
    expect(url.ok).toBe(true);
    if (url.ok) {
      expect((url.output as { validCount: number }).validCount).toBe(1);
      expect((url.output as { invalidCount: number }).invalidCount).toBe(1);
    }

    const ip = await invokeTool(registry, {
      toolId: "dev/ip-validate",
      input: { text: "127.0.0.1\n::1\n999.1.1.1" },
    });
    expect(ip.ok).toBe(true);
    if (ip.ok) {
      expect((ip.output as { validCount: number }).validCount).toBe(2);
    }

    const uuid = await invokeTool(registry, {
      toolId: "dev/uuid-validate",
      input: { text: "550e8400-e29b-41d4-a716-446655440000\nnope" },
    });
    expect(uuid.ok).toBe(true);
    if (uuid.ok) {
      expect((uuid.output as { validCount: number }).validCount).toBe(1);
    }

    const rnd = await invokeTool(registry, {
      toolId: "dev/random-string",
      input: { length: 12, count: 2, charset: "hex" },
    });
    expect(rnd.ok).toBe(true);
    if (rnd.ok) {
      const strings = (rnd.output as { strings: string[] }).strings;
      expect(strings).toHaveLength(2);
      expect(strings[0]).toMatch(/^[0-9a-f]{12}$/);
    }

    const read = await invokeTool(registry, {
      toolId: "text/reading-time",
      input: { text: "Hello world. 你好世界。" },
    });
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect((read.output as { seconds: number }).seconds).toBeGreaterThan(0);
    }

    const toc = await invokeTool(registry, {
      toolId: "doc/markdown-toc",
      input: { text: "# Title\n\n## Section A\n\n### Deep\n\n## Section B\n", maxLevel: 2 },
    });
    expect(toc.ok).toBe(true);
    if (toc.ok) {
      expect((toc.output as { count: number }).count).toBe(3);
      expect(String((toc.output as { toc: string }).toc)).toContain("Section A");
    }

    expect(registry.get("json-diff").roots).toContain("comparator");
    expect(registry.get("url-validate").roots).toContain("checker");
    expect(registry.get("random-string").roots).toContain("generator");
  });

  it("builds demand-root hubs and relates tools by root", () => {
    const registry = ForgeRegistry.openDefault();
    const hub = buildRootHub(registry, "generator");
    expect(hub.path).toBe("/r/generator");
    expect(hub.tools.length).toBeGreaterThanOrEqual(5);
    expect(hub.tools.every((t) => t.roots?.includes("generator"))).toBe(true);
    const page = buildToolPageModel(registry, "uuid");
    expect(page.related.some((t) => t.roots?.includes("generator"))).toBe(true);
  });

  it("ships W4/W5 tools including pdf-compress and matrix gaps", async () => {
    const registry = ForgeRegistry.openDefault();
    for (const slug of [
      "exif-viewer",
      "jwt-generate",
      "secret-generate",
      "hmac-verify",
      "url-parse",
      "base64url",
      "color-contrast",
      "pdf-optimize",
      "pdf-compress",
      "pdf-text",
      "image-crop",
    ]) {
      expect(registry.has(slug)).toBe(true);
    }
    // Hard-correct: still-deferred blades stay out of product registry.
    for (const slug of ["router-translate", "kinship", "phone-lookup"]) {
      expect(registry.has(slug)).toBe(false);
    }
    // SOTA re-entry (CSSO / Prettier / html-minifier-terser / SVGO / ua-parser-js)
    for (const slug of [
      "svg-optimize",
      "css-minify",
      "html-minify",
      "user-agent-parse",
      "css-format",
      "html-format",
    ]) {
      expect(registry.has(slug)).toBe(true);
    }
    const svg = await invokeTool(registry, {
      toolId: "image/svg-optimize",
      input: { text: '<svg xmlns="http://www.w3.org/2000/svg">  <!--x-->  <g> </g> </svg>' },
    });
    expect(svg.ok).toBe(true);
    if (svg.ok) {
      expect(String((svg.output as { engine: string }).engine)).toBe("svgo");
    }
    expect(registry.get("pdf-optimize").roots).toContain("optimizer");
    expect(registry.get("pdf-compress").roots).toContain("optimizer");

    // Minimal valid PDF via simple markdown path, then compress with pdf-lib force
    const simple = markdownToSimplePdf("# hi", "compress-test");
    expect(simple.subarray(0, 4).toString("utf8")).toBe("%PDF");
    const compressed = await compressPdfBuffer(Buffer.from(simple), {
      quality: "structural",
      engine: "pdf-lib",
    });
    expect(compressed.engine).toBe("pdf-lib");
    expect(compressed.base64.length).toBeGreaterThan(20);
    expect(compressed.bytesOut).toBeGreaterThan(0);
    const jwt = await invokeTool(registry, {
      toolId: "codec/jwt-generate",
      input: {
        payload: JSON.stringify({ sub: "u1" }),
        secret: "s3cret",
        expiresInSec: 60,
      },
    });
    expect(jwt.ok).toBe(true);
    if (jwt.ok) {
      const token = String((jwt.output as { token: string }).token);
      expect(token.split(".")).toHaveLength(3);
    }
    const secret = await invokeTool(registry, {
      toolId: "security/secret-generate",
      input: { bytes: 16, encoding: "hex", count: 1 },
    });
    expect(secret.ok).toBe(true);
    if (secret.ok) {
      expect(String((secret.output as { secrets: string[] }).secrets[0])).toHaveLength(32);
    }
  });

  it("ships W3 competitor staples (rot13, multi-hash, morse, life calcs)", async () => {
    const registry = ForgeRegistry.openDefault();
    for (const slug of [
      "rot13",
      "morse",
      "text-binary",
      "base32",
      "multi-hash",
      "css-format",
      "html-format",
      "string-similarity",
      "roman-numerals",
      "age-calculator",
      "tip-calculator",
      "aspect-ratio",
      "mime-lookup",
      "user-agent-parse",
      "image-meta",
    ]) {
      expect(registry.has(slug)).toBe(true);
    }

    const rot = await invokeTool(registry, {
      toolId: "codec/rot13",
      input: { text: "Hello", shift: 13 },
    });
    expect(rot.ok).toBe(true);
    if (rot.ok) expect((rot.output as { result: string }).result).toBe("Uryyb");

    const hash = await invokeTool(registry, {
      toolId: "hash/multi-hash",
      input: { text: "nebutra", encoding: "hex" },
    });
    expect(hash.ok).toBe(true);
    if (hash.ok) {
      expect(String((hash.output as { md5: string }).md5)).toHaveLength(32);
      expect(String((hash.output as { sha256: string }).sha256)).toHaveLength(64);
    }

    const sim = await invokeTool(registry, {
      toolId: "text/string-similarity",
      input: { a: "kitten", b: "sitting" },
    });
    expect(sim.ok).toBe(true);
    if (sim.ok) expect((sim.output as { distance: number }).distance).toBe(3);

    const tip = await invokeTool(registry, {
      toolId: "life/tip-calculator",
      input: { bill: 100, tipPercent: 15, people: 2 },
    });
    expect(tip.ok).toBe(true);
    if (tip.ok) {
      expect((tip.output as { tip: number }).tip).toBe(15);
      expect((tip.output as { perPerson: number }).perPerson).toBe(57.5);
    }

    const mime = await invokeTool(registry, {
      toolId: "dev/mime-lookup",
      input: { text: "photo.png\nnotes.md\nunknown.zzz" },
    });
    expect(mime.ok).toBe(true);
    if (mime.ok) {
      expect((mime.output as { knownCount: number }).knownCount).toBe(2);
      expect((mime.output as { unknownCount: number }).unknownCount).toBe(1);
    }
  });
  it("extracts text from minimal DOCX (pure zip)", async () => {
    const { deflateRawSync } = await import("node:zlib");
    const xml =
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello DOCX</w:t></w:r></w:p></w:body></w:document>';
    const name = Buffer.from("word/document.xml", "utf8");
    const data = deflateRawSync(Buffer.from(xml, "utf8"));
    const local = Buffer.alloc(30 + name.length + data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(Buffer.byteLength(xml), 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    data.copy(local, 30 + name.length);
    // central directory + EOCD (minimal, some unzippers need it; our reader only scans local headers)
    const zip = local;
    const registry = ForgeRegistry.openDefault();
    expect(registry.has("docx-text")).toBe(true);
    const r = await invokeTool(registry, {
      toolId: "doc/docx-text",
      input: { fileBase64: zip.toString("base64") },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(String((r.output as { text: string }).text)).toContain("Hello DOCX");
    }
  });

  it("memory job store is async and multi-step", async () => {
    const { MemoryJobStore } = await import("./jobs");
    const store = new MemoryJobStore();
    const job = await store.create("doc/docx-text");
    expect(job.status).toBe("queued");
    await store.markRunning(job.id);
    const running = await store.get(job.id);
    expect(running?.status).toBe("running");
    await store.complete(job.id, { ok: true });
    const done = await store.get(job.id);
    expect(done?.status).toBe("succeeded");
  });

  it("extracts CSV from minimal XLSX (pure zip)", async () => {
    const { deflateRawSync } = await import("node:zlib");
    const shared =
      '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Name</t></si><si><t>Ada</t></si></sst>';
    const sheet =
      '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>2</v></c></row></sheetData></worksheet>';
    function local(path: string, content: string) {
      const name = Buffer.from(path, "utf8");
      const data = deflateRawSync(Buffer.from(content, "utf8"));
      const buf = Buffer.alloc(30 + name.length + data.length);
      buf.writeUInt32LE(0x04034b50, 0);
      buf.writeUInt16LE(20, 4);
      buf.writeUInt16LE(8, 8);
      buf.writeUInt32LE(data.length, 18);
      buf.writeUInt32LE(Buffer.byteLength(content), 22);
      buf.writeUInt16LE(name.length, 26);
      name.copy(buf, 30);
      data.copy(buf, 30 + name.length);
      return buf;
    }
    const zip = Buffer.concat([
      local("xl/sharedStrings.xml", shared),
      local("xl/worksheets/sheet1.xml", sheet),
    ]);
    const registry = ForgeRegistry.openDefault();
    expect(registry.has("xlsx-text")).toBe(true);
    const r = await invokeTool(registry, {
      toolId: "doc/xlsx-text",
      input: { fileBase64: zip.toString("base64") },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const csv = String((r.output as { csv: string }).csv);
      expect(csv).toContain("Name");
      expect(csv).toContain("Ada");
    }
  });

  it("extracts outline from minimal PPTX (pure zip)", async () => {
    const { deflateRawSync } = await import("node:zlib");
    const slide =
      '<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Hello Slide</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
    function local(path: string, content: string) {
      const name = Buffer.from(path, "utf8");
      const data = deflateRawSync(Buffer.from(content, "utf8"));
      const buf = Buffer.alloc(30 + name.length + data.length);
      buf.writeUInt32LE(0x04034b50, 0);
      buf.writeUInt16LE(20, 4);
      buf.writeUInt16LE(8, 8);
      buf.writeUInt32LE(data.length, 18);
      buf.writeUInt32LE(Buffer.byteLength(content), 22);
      buf.writeUInt16LE(name.length, 26);
      name.copy(buf, 30);
      data.copy(buf, 30 + name.length);
      return buf;
    }
    const zip = local("ppt/slides/slide1.xml", slide);
    const registry = ForgeRegistry.openDefault();
    expect(registry.has("pptx-text")).toBe(true);
    const r = await invokeTool(registry, {
      toolId: "doc/pptx-text",
      input: { fileBase64: zip.toString("base64") },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(String((r.output as { text: string }).text)).toContain("Hello Slide");
    }
  });

  it("resolves job dispatch mode from env", async () => {
    const { resolveJobDispatchMode } = await import("./job-dispatch");
    expect(resolveJobDispatchMode({})).toBe("inline");
    expect(
      resolveJobDispatchMode({ FORGE_JOB_MODE: "http", FORGE_JOB_WORKER_URL: "https://x/w" }),
    ).toBe("http");
    expect(
      resolveJobDispatchMode({
        QSTASH_TOKEN: "t",
        FORGE_JOB_WORKER_URL: "https://x/w",
      }),
    ).toBe("qstash");
  });
});
