import { describe, expect, it } from "vitest";
import {
  colorDeltaETool,
  dbmlParseTool,
  dbmlToSqlTool,
  dnsLeakTool,
  dnsLookupTool,
  mermaidRenderTool,
  myIpTool,
  sqlToDbmlTool,
} from "./wave6-hard-correct";

describe("wave6 hard-correct tools", () => {
  it("color-delta-e returns CIEDE2000 for two colors", async () => {
    const out = (await colorDeltaETool.execute({
      a: "#0033FE",
      b: "#0BF1C3",
    })) as { deltaE00: number; verdict: string };
    expect(out.deltaE00).toBeGreaterThan(0);
    expect(out.verdict).toBeTruthy();
  });

  it("dbml-parse lists tables", async () => {
    const out = (await dbmlParseTool.execute({
      text: `Table a {\n  id int [pk]\n}\nTable b {\n  a_id int [ref: > a.id]\n}`,
    })) as { tableCount: number; tables: Array<{ name: string }> };
    expect(out.tableCount).toBe(2);
    expect(out.tables.map((t) => t.name).sort()).toEqual(["a", "b"]);
  });

  it("dbml-to-sql emits postgres DDL", async () => {
    const out = (await dbmlToSqlTool.execute({
      text: `Table users {\n  id integer [pk]\n  name varchar\n}`,
      dialect: "postgres",
    })) as { sql: string };
    expect(out.sql.toLowerCase()).toContain("create table");
    expect(out.sql.toLowerCase()).toContain("users");
  });

  it("sql-to-dbml imports simple ddl", async () => {
    const out = (await sqlToDbmlTool.execute({
      text: "CREATE TABLE t (id int primary key);",
      dialect: "postgres",
    })) as { dbml: string };
    expect(out.dbml.toLowerCase()).toContain("table");
    expect(out.dbml.toLowerCase()).toContain("t");
  });

  it("my-ip prefers first forwarded hop", async () => {
    const out = (await myIpTool.execute({
      forwardedFor: "203.0.113.10, 10.0.0.1",
      remoteAddress: "10.0.0.2",
    })) as { clientIp: string | null; forwardedChain: string[] };
    expect(out.clientIp).toBe("203.0.113.10");
    expect(out.forwardedChain).toHaveLength(2);
  });

  it("dns-lookup resolves example.com A (network)", async () => {
    const out = (await dnsLookupTool.execute({
      name: "example.com",
      type: "A",
    })) as { count: number; records: unknown[] };
    expect(out.count).toBeGreaterThan(0);
  }, 15_000);

  it("mermaid-render parse_only returns diagramType", async () => {
    const out = (await mermaidRenderTool.execute({
      text: "flowchart LR\n  A-->B",
      mode: "parse_only",
    })) as { diagramType: string; svg: null };
    expect(out.diagramType.toLowerCase()).toContain("flow");
    expect(out.svg).toBeNull();
  });

  it("dns-leak multi-resolver probe returns honesty + edge ip", async () => {
    const out = (await dnsLeakTool.execute({
      probeHost: "example.com",
      forwardedFor: "198.51.100.20",
      clientProbes: [
        {
          path: "doh-cloudflare",
          kind: "doh",
          name: "example.com",
          answers: ["93.184.215.14"],
          ms: 12,
        },
      ],
      webrtcIps: ["10.0.0.5", "198.51.100.20"],
    })) as {
      verdict: string;
      edgeClientIp: string | null;
      forgeResolvers: unknown[];
      honesty: { fullSystemDnsLeakMap: boolean };
    };
    expect(out.edgeClientIp).toBe("198.51.100.20");
    expect(out.forgeResolvers.length).toBeGreaterThanOrEqual(4);
    expect(out.honesty.fullSystemDnsLeakMap).toBe(false);
    expect(["consistent", "split_paths", "ip_mismatch", "incomplete"]).toContain(out.verdict);
  }, 30_000);

  it("dns-leak honesty distinguishes online-no-hits from offline infra", async () => {
    const online = (await dnsLeakTool.execute({
      probeHost: "example.com",
      infrastructureAvailable: true,
      authorityZone: "leak.nebutra.com",
      sessionId: "abc123",
      clientProbes: [{ path: "doh-google", kind: "doh", answers: ["93.184.215.14"] }],
    })) as {
      honesty: { recommendation: string; reason: string };
      signals: string[];
      infrastructureAvailable: boolean;
    };
    expect(online.infrastructureAvailable).toBe(true);
    expect(online.signals).toContain("authority_zone_online_no_recursive_hits");
    expect(online.honesty.recommendation).not.toMatch(/Deploy @nebutra\/forge-dns-leak/);
    expect(online.honesty.reason).toMatch(/online/i);

    const captured = (await dnsLeakTool.execute({
      probeHost: "example.com",
      infrastructureAvailable: true,
      authorityReady: true,
      authorityZone: "leak.nebutra.com",
      authorityResolvers: [{ ip: "8.8.8.8", count: 2 }],
      clientProbes: [{ path: "doh-google", kind: "doh", answers: ["93.184.215.14"] }],
    })) as { verdict: string; honesty: { fullSystemDnsLeakMap: boolean } };
    expect(captured.verdict).toBe("authority_captured");
    expect(captured.honesty.fullSystemDnsLeakMap).toBe(true);
  }, 30_000);
});
