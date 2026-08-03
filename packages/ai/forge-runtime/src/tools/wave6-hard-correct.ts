/**
 * Wave-6 hard-correct product tools (network + diagram + color science + DBML).
 *
 * Decisions (no degraded ship):
 * - DNS / reverse / TLS: Node built-ins; honest about resolver egress
 * - my-ip: server-only; host injects connection headers (not forge-runtime ambient)
 * - mermaid: official mermaid; parse always; SVG via Playwright + mermaid.min.js (not JSDOM)
 * - color-delta-e: culori CIEDE2000 (already depend on culori)
 * - DBML: @dbml/core parse + SQL convert only — NO fake ERD visualizer until layout ships
 */
import { promises as dns } from "node:dns";
import { connect as tlsConnect } from "node:tls";
import { importer, ModelExporter, Parser } from "@dbml/core";
import {
  differenceCiede2000 as ciede2000Factory,
  converter,
  formatCss,
  formatHex,
  parse as parseColor,
} from "culori";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR"] as const;

// ── DNS lookup ──────────────────────────────────────────────────────────────

export const dnsLookupTool = tool({
  id: "net/dns-lookup",
  slug: "dns-lookup",
  category: "dev",
  title: { zh: "DNS 解析", en: "DNS Lookup" },
  description: {
    zh: "解析 A/AAAA/MX/TXT/NS/CNAME 等记录（Node dns，结果随 Forge 出口解析器）",
    en: "Resolve A/AAAA/MX/TXT/NS/CNAME (Node dns; answers from the Forge host resolver)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.net.dns_lookup",
  roots: ["checker", "viewer"],
  engine: {
    name: "node:dns",
    upstream: "https://nodejs.org/api/dns.html",
    version: "runtime",
  },
  seoKeywords: {
    zh: "dns查询,dns解析,mx记录查询",
    en: "dns lookup online, mx record check, dns resolve tool",
  },
  inputSchema: z.object({
    name: z.string().min(1).max(253),
    type: z.enum(DNS_TYPES).default("A"),
  }),
  execute: async (input: { name: string; type?: (typeof DNS_TYPES)[number] }) => {
    const type = input.type ?? "A";
    const name = input.name.trim().replace(/\.$/, "");
    if (!name) throw new Error("name required");

    if (type === "PTR") {
      const ptr = await dns.reverse(name);
      return {
        name,
        type,
        records: ptr.map((p) => ({ value: p })),
        count: ptr.length,
        note: "PTR uses dns.reverse on the Forge host resolver egress.",
        engine: "node:dns",
      };
    }

    const records = await dns.resolve(name, type);
    const list = Array.isArray(records) ? records : [records];
    const normalized = list.map((r) => {
      if (typeof r === "string") return { value: r };
      if (typeof r === "object" && r !== null) {
        return { ...(r as unknown as Record<string, unknown>) };
      }
      return { value: String(r) };
    });

    return {
      name,
      type,
      records: normalized,
      count: normalized.length,
      note: "Answers come from the Forge server DNS resolver, which may differ from your browser or local stub.",
      engine: "node:dns",
    };
  },
});

// ── TLS certificate inspect ─────────────────────────────────────────────────

export const tlsCertInspectTool = tool({
  id: "net/tls-cert-inspect",
  slug: "tls-cert-inspect",
  category: "dev",
  title: { zh: "TLS 证书检测", en: "TLS Certificate Inspect" },
  description: {
    zh: "连接主机 443 读取证书主体、SAN、有效期与指纹",
    en: "Connect to host:443 and read subject, SANs, validity, fingerprints",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.net.tls_cert",
  roots: ["checker", "viewer"],
  engine: {
    name: "node:tls",
    upstream: "https://nodejs.org/api/tls.html",
    version: "runtime",
  },
  seoKeywords: {
    zh: "ssl证书查询,tls证书检测,证书过期",
    en: "ssl certificate checker online, tls cert inspect, certificate expiry",
  },
  inputSchema: z.object({
    host: z.string().min(1).max(253),
    port: z.coerce.number().int().min(1).max(65535).default(443),
    servername: z.string().max(253).optional(),
    timeoutMs: z.coerce.number().int().min(500).max(15_000).default(5_000),
  }),
  execute: async (input: {
    host: string;
    port?: number;
    servername?: string;
    timeoutMs?: number;
  }) => {
    const host =
      input.host
        .trim()
        .replace(/^https?:\/\//, "")
        .split("/")[0] ?? "";
    if (!host) throw new Error("host required");
    // Hard SSRF floor: never dial obvious private / metadata targets from product tools.
    if (
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|0\.0\.0\.0|::1)/i.test(
        host,
      )
    ) {
      throw new Error("Refusing private/link-local hosts (SSRF protection)");
    }
    const port = input.port ?? 443;
    const servername = input.servername?.trim() || host;
    const timeoutMs = input.timeoutMs ?? 5_000;

    const cert = await new Promise<{
      subject: Record<string, string>;
      issuer: Record<string, string>;
      valid_from: string;
      valid_to: string;
      serialNumber: string;
      fingerprint256: string;
      subjectaltname?: string;
    }>((resolve, reject) => {
      const socket = tlsConnect(
        {
          host,
          port,
          servername,
          rejectUnauthorized: false,
          // We inspect the presented leaf; chain trust is reported separately.
        },
        () => {
          const peer = socket.getPeerCertificate(true);
          socket.end();
          if (!peer || Object.keys(peer).length === 0) {
            reject(new Error("No certificate presented"));
            return;
          }
          resolve(peer as typeof cert extends Promise<infer T> ? T : never);
        },
      );
      socket.setTimeout(timeoutMs, () => {
        socket.destroy();
        reject(new Error(`TLS connect timed out after ${timeoutMs}ms`));
      });
      socket.on("error", (err) => reject(err));
    });

    const validTo = new Date(cert.valid_to);
    const validFrom = new Date(cert.valid_from);
    const now = Date.now();
    const daysRemaining = Math.floor((validTo.getTime() - now) / 86_400_000);
    const sans = (cert.subjectaltname ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      host,
      port,
      servername,
      subject: cert.subject,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
      fingerprint256: cert.fingerprint256,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      daysRemaining,
      expired: validTo.getTime() < now,
      notYetValid: validFrom.getTime() > now,
      subjectAltNames: sans,
      note: "rejectUnauthorized=false for inspection only — this is not a trust verdict.",
      engine: "node:tls",
    };
  },
});

// ── My IP (host injects connection context) ─────────────────────────────────

export const myIpTool = tool({
  id: "net/my-ip",
  slug: "my-ip",
  category: "dev",
  title: { zh: "我的 IP", en: "My IP" },
  description: {
    zh: "查看请求到达 Forge 时的客户端 IP 与关键头（由主机注入，不含虚假 Geo）",
    en: "Show client IP and key headers as seen by Forge (host-injected; no fake geo)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.net.my_ip",
  roots: ["viewer", "checker"],
  engine: {
    name: "request-headers",
    upstream: "Forge host injects connection metadata",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "查看我的ip,公网ip查询",
    en: "what is my ip, public ip checker",
  },
  inputSchema: z.object({
    /** Prefer first public hop; host should pass X-Forwarded-For chain. */
    forwardedFor: z.string().max(2_000).optional(),
    realIp: z.string().max(128).optional(),
    remoteAddress: z.string().max(128).optional(),
    userAgent: z.string().max(1_000).optional(),
    acceptLanguage: z.string().max(200).optional(),
  }),
  execute: (input: {
    forwardedFor?: string;
    realIp?: string;
    remoteAddress?: string;
    userAgent?: string;
    acceptLanguage?: string;
  }) => {
    const chain = (input.forwardedFor ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const clientIp = chain[0] || input.realIp || input.remoteAddress || null;
    return {
      clientIp,
      forwardedChain: chain,
      remoteAddress: input.remoteAddress ?? null,
      realIp: input.realIp ?? null,
      userAgent: input.userAgent ?? null,
      acceptLanguage: input.acceptLanguage ?? null,
      note: "IP is as observed by the Forge edge/host. No ASN/geo is attached without a licensed data source.",
      engine: "request-headers",
    };
  },
});

// ── Mermaid render ──────────────────────────────────────────────────────────

/**
 * Hard-correct mermaid path:
 * 1) mermaid.parse in Node (syntax / diagramType) — no DOM
 * 2) SVG via Playwright Chromium + bundled mermaid.min.js (same class of host
 *    dependency as md-to-pdf). JSDOM is intentionally rejected: mermaid 11 +
 *    DOMPurify do not run cleanly there.
 */
async function mermaidParseOnly(definition: string): Promise<{ diagramType: string }> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  const parsed = await mermaid.parse(definition);
  return {
    diagramType:
      typeof parsed === "object" && parsed && "diagramType" in parsed
        ? String((parsed as { diagramType?: string }).diagramType ?? "unknown")
        : "unknown",
  };
}

async function mermaidToSvg(definition: string): Promise<{ svg: string; diagramType: string }> {
  const { diagramType } = await mermaidParseOnly(definition);

  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "Mermaid SVG requires Playwright Chromium on the product host (same stack as md-to-pdf).",
    );
  }

  const { createRequire } = await import("node:module");
  const { readFile } = await import("node:fs/promises");
  const require = createRequire(import.meta.url);
  // Prefer UMD build for page injection without module loaders.
  let mermaidJs: string;
  try {
    mermaidJs = await readFile(require.resolve("mermaid/dist/mermaid.min.js"), "utf8");
  } catch {
    throw new Error("mermaid/dist/mermaid.min.js not found next to @nebutra/forge-runtime");
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    const payload = JSON.stringify(definition);
    await page.setContent(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>
<div id="app"></div>
<script>${mermaidJs}</script>
<script>
(async () => {
  try {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
    const { svg } = await mermaid.render('forge_mmd', ${payload});
    window.__FORGE_MMD__ = { ok: true, svg };
  } catch (e) {
    window.__FORGE_MMD__ = { ok: false, error: String(e && e.message ? e.message : e) };
  }
})();
</script>
</body></html>`,
      { waitUntil: "load", timeout: 30_000 },
    );
    await page.waitForFunction(
      () => Boolean((window as unknown as { __FORGE_MMD__?: { ok: boolean } }).__FORGE_MMD__),
      { timeout: 30_000 },
    );
    const result = await page.evaluate(
      () =>
        (window as unknown as { __FORGE_MMD__: { ok: boolean; svg?: string; error?: string } })
          .__FORGE_MMD__,
    );
    if (!result.ok || !result.svg) {
      throw new Error(result.error ?? "mermaid.render returned empty svg");
    }
    return { svg: result.svg, diagramType };
  } finally {
    await browser.close();
  }
}

export const mermaidRenderTool = tool({
  id: "doc/mermaid-render",
  slug: "mermaid-render",
  category: "doc",
  title: { zh: "Mermaid 渲染", en: "Mermaid Render" },
  description: {
    zh: "官方 mermaid 校验并渲染 SVG（服务端 JSDOM；非 DBML ERD）",
    en: "Official mermaid parse + SVG render (server JSDOM; not a DBML ERD)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.doc.mermaid_render",
  roots: ["viewer", "generator"],
  engine: {
    name: "mermaid+playwright",
    upstream: "https://github.com/mermaid-js/mermaid",
    version: "11.x",
  },
  seoKeywords: {
    zh: "mermaid在线,流程图渲染,时序图",
    en: "mermaid live editor online, render mermaid diagram, flowchart svg",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(100_000),
    /** parse_only skips Chromium SVG (cheap syntax check for agents). */
    mode: z.enum(["svg", "parse_only"]).default("svg"),
  }),
  execute: async (input: { text: string; mode?: "svg" | "parse_only" }) => {
    const text = input.text.trim();
    if (!text) throw new Error("text required");
    const mode = input.mode ?? "svg";
    try {
      if (mode === "parse_only") {
        const { diagramType } = await mermaidParseOnly(text);
        return {
          ok: true as const,
          mode,
          diagramType,
          svg: null,
          engine: "mermaid.parse",
          note: "parse_only — no SVG. Use mode=svg on a Playwright-equipped product host.",
        };
      }
      const { svg, diagramType } = await mermaidToSvg(text);
      return {
        ok: true as const,
        mode,
        diagramType,
        svg,
        bytes: Buffer.byteLength(svg, "utf8"),
        engine: "mermaid+playwright",
        note: "SVG via mermaid securityLevel=strict + Playwright Chromium. Not a DBML ERD product.",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Mermaid render failed: ${message}`);
    }
  },
});

// ── Color ΔE (CIEDE2000) ────────────────────────────────────────────────────

const toLab = converter("lab");

export const colorDeltaETool = tool({
  id: "dev/color-delta-e",
  slug: "color-delta-e",
  category: "dev",
  title: { zh: "色差 ΔE（CIEDE2000）", en: "Color ΔE (CIEDE2000)" },
  description: {
    zh: "culori CIEDE2000 计算两色感知色差；附 Lab/OKLCH",
    en: "Perceptual color difference via culori CIEDE2000 with Lab/OKLCH",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.color_delta_e",
  roots: ["checker", "analyzer"],
  engine: {
    name: "culori",
    upstream: "https://github.com/Evercoder/culori (differenceCiede2000)",
    version: "4.x",
  },
  seoKeywords: {
    zh: "色差计算,delta e,ciede2000",
    en: "delta e calculator online, ciede2000 color difference",
  },
  inputSchema: z.object({
    a: z.string().min(1).max(64).default("#0033FE"),
    b: z.string().min(1).max(64).default("#0BF1C3"),
  }),
  execute: (input: { a?: string; b?: string }) => {
    const ca = parseColor(input.a ?? "#0033FE");
    const cb = parseColor(input.b ?? "#0BF1C3");
    if (!ca) throw new Error(`Unable to parse color A: ${input.a}`);
    if (!cb) throw new Error(`Unable to parse color B: ${input.b}`);
    // culori: differenceCiede2000() returns a comparator (a,b) => number
    const deltaE = ciede2000Factory()(ca, cb);
    const labA = toLab(ca);
    const labB = toLab(cb);
    const toOklch = converter("oklch");
    const oklchA = toOklch(ca);
    const oklchB = toOklch(cb);
    const d = Number(Number(deltaE).toFixed(4));
    const verdict =
      d < 1
        ? "imperceptible"
        : d < 2
          ? "close"
          : d < 5
            ? "noticeable"
            : d < 10
              ? "different"
              : "very_different";
    return {
      deltaE00: d,
      verdict,
      a: {
        input: input.a,
        hex: formatHex(ca),
        css: formatCss(ca),
        lab: labA
          ? {
              l: Number(labA.l?.toFixed(3)),
              a: Number(labA.a?.toFixed(3)),
              b: Number(labA.b?.toFixed(3)),
            }
          : null,
        oklch: oklchA
          ? {
              l: Number(oklchA.l?.toFixed(4)),
              c: Number(oklchA.c?.toFixed(4)),
              h: oklchA.h != null ? Number(oklchA.h.toFixed(2)) : null,
            }
          : null,
      },
      b: {
        input: input.b,
        hex: formatHex(cb),
        css: formatCss(cb),
        lab: labB
          ? {
              l: Number(labB.l?.toFixed(3)),
              a: Number(labB.a?.toFixed(3)),
              b: Number(labB.b?.toFixed(3)),
            }
          : null,
        oklch: oklchB
          ? {
              l: Number(oklchB.l?.toFixed(4)),
              c: Number(oklchB.c?.toFixed(4)),
              h: oklchB.h != null ? Number(oklchB.h.toFixed(2)) : null,
            }
          : null,
      },
      note: "ΔE00 thresholds are rules of thumb for UI review, not a print-shop contract.",
      engine: "culori.differenceCiede2000",
    };
  },
});

// ── DBML parse / convert (no ERD canvas) ─────────────────────────────────────

const DBML_SAMPLE = `Table users {
  id integer [pk, increment]
  email varchar [unique, not null]
  name varchar
  created_at timestamp
}

Table posts {
  id integer [pk]
  user_id integer [not null, ref: > users.id]
  title varchar [not null]
  body text
}
`;

function summarizeDbml(database: {
  schemas?: Array<{
    tables?: Array<{
      name: string;
      fields?: Array<{ name: string; type?: { type_name?: string } | string }>;
      indexes?: unknown[];
    }>;
    enums?: Array<{ name: string }>;
    refs?: unknown[];
  }>;
}): {
  tables: Array<{ name: string; columns: number; indexes: number }>;
  enums: string[];
  refCount: number;
  tableCount: number;
} {
  const schema = database.schemas?.[0];
  const tables = (schema?.tables ?? []).map((t) => ({
    name: t.name,
    columns: t.fields?.length ?? 0,
    indexes: t.indexes?.length ?? 0,
  }));
  const enums = (schema?.enums ?? []).map((e) => e.name);
  const refCount = schema?.refs?.length ?? 0;
  return { tables, enums, refCount, tableCount: tables.length };
}

export const dbmlParseTool = tool({
  id: "data/dbml-parse",
  slug: "dbml-parse",
  category: "data",
  title: { zh: "DBML 解析", en: "DBML Parse" },
  description: {
    zh: "@dbml/core 解析 DBML，列出表/字段/关系（不含 ER 图画布）",
    en: "Parse DBML with @dbml/core into tables/columns/refs (no ERD canvas)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.dbml_parse",
  roots: ["analyzer", "viewer"],
  engine: {
    name: "@dbml/core",
    upstream: "https://github.com/holistics/dbml",
    version: "9.x",
  },
  seoKeywords: {
    zh: "dbml解析,数据库标记语言,dbdiagram",
    en: "dbml parser online, database markup language, dbdiagram dsl",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(500_000).default(DBML_SAMPLE),
  }),
  execute: (input: { text: string }) => {
    const parser = new Parser();
    try {
      const database = parser.parse(input.text, "dbml");
      const summary = summarizeDbml(database as Parameters<typeof summarizeDbml>[0]);
      return {
        ok: true as const,
        ...summary,
        note: "Hard-correct: this is parse/summary only. Visual ERD is a separate product surface.",
        engine: "@dbml/core",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`DBML parse failed: ${message}`);
    }
  },
});

export const dbmlToSqlTool = tool({
  id: "data/dbml-to-sql",
  slug: "dbml-to-sql",
  category: "data",
  title: { zh: "DBML → SQL", en: "DBML to SQL" },
  description: {
    zh: "@dbml/core 将 DBML 导出为 PostgreSQL / MySQL / MSSQL / Oracle SQL",
    en: "Export DBML to PostgreSQL / MySQL / MSSQL / Oracle via @dbml/core",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.dbml_to_sql",
  roots: ["converter", "generator"],
  engine: {
    name: "@dbml/core ModelExporter",
    upstream: "https://github.com/holistics/dbml",
    version: "9.x",
  },
  seoKeywords: {
    zh: "dbml转sql,dbml postgres",
    en: "dbml to sql converter, dbml to postgres",
  },
  inputSchema: z.object({
    text: z.string().min(1).max(500_000).default(DBML_SAMPLE),
    dialect: z.enum(["postgres", "mysql", "mssql", "oracle"]).default("postgres"),
  }),
  execute: (input: { text: string; dialect?: "postgres" | "mysql" | "mssql" | "oracle" }) => {
    const dialect = input.dialect ?? "postgres";
    const parser = new Parser();
    const database = parser.parse(input.text, "dbml");
    const sql = ModelExporter.export(database, dialect);
    return {
      sql: String(sql),
      dialect,
      bytes: Buffer.byteLength(String(sql), "utf8"),
      engine: "@dbml/core",
    };
  },
});

export const sqlToDbmlTool = tool({
  id: "data/sql-to-dbml",
  slug: "sql-to-dbml",
  category: "data",
  title: { zh: "SQL → DBML", en: "SQL to DBML" },
  description: {
    zh: "@dbml/core 将 SQL DDL 导入为 DBML",
    en: "Import SQL DDL to DBML via @dbml/core",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.sql_to_dbml",
  roots: ["converter"],
  engine: {
    name: "@dbml/core importer",
    upstream: "https://github.com/holistics/dbml",
    version: "9.x",
  },
  seoKeywords: {
    zh: "sql转dbml,ddl转dbml",
    en: "sql to dbml converter, ddl to dbml online",
  },
  inputSchema: z.object({
    text: z
      .string()
      .min(1)
      .max(500_000)
      .default(
        `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR
);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR NOT NULL
);`,
      ),
    dialect: z.enum(["postgres", "mysql", "mssql", "oracle"]).default("postgres"),
  }),
  execute: (input: { text: string; dialect?: "postgres" | "mysql" | "mssql" | "oracle" }) => {
    const dialect = input.dialect ?? "postgres";
    const dbml = importer.import(input.text, dialect);
    return {
      dbml: String(dbml),
      dialect,
      bytes: Buffer.byteLength(String(dbml), "utf8"),
      engine: "@dbml/core",
    };
  },
});

export const wave6HardCorrectTools: readonly AnyForgeToolDefinition[] = [
  dnsLookupTool,
  tlsCertInspectTool,
  myIpTool,
  mermaidRenderTool,
  colorDeltaETool,
  dbmlParseTool,
  dbmlToSqlTool,
  sqlToDbmlTool,
];
