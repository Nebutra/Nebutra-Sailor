"use client";

/**
 * Wave-6 hard-correct product runners: network, mermaid, ΔE, DBML.
 */
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  InstantTransformShell,
  ShellBadge,
  ShellNote,
  type ShellTone,
  ShellVerdict,
} from "@/components/journey-shells";
import {
  invokeForge,
  MetaCards,
  TextResultActions,
  useDebouncedCallback,
} from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerPanel, RunnerSelect } from "@/components/runner-ui";

const DBML_SAMPLE = `Table users {
  id integer [primary key, increment]
  email varchar [unique, not null]
  name varchar
}

Table posts {
  id integer [primary key]
  user_id integer [not null, ref: > users.id]
  title varchar [not null]
}
`;

const MERMAID_SAMPLE = `flowchart LR
  A[User] --> B[Forge]
  B --> C[DNS]
  B --> D[TLS]
  B --> E[Mermaid]
`;

export function DnsLookupRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [name, setName] = useState("example.com");
  const [type, setType] = useState("A");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { name, type });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const records = Array.isArray(out?.records)
    ? (out.records as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("dns.name")}
          id="dns-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-mono"
        />
        <RunnerSelect id="dns-type" label={t("dns.type")} value={type} onChange={setType}>
          {["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "PTR"].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </RunnerSelect>
      </div>
      <Button
        type="button"
        variant="ink"
        onClick={() => void run()}
        disabled={loading || !name.trim()}
      >
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="space-y-2">
          <ShellBadge tone="info">
            {String(out.type)} · {String(out.count ?? records.length)}
          </ShellBadge>
          <pre className="max-h-96 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs">
            {JSON.stringify(records, null, 2)}
          </pre>
          <TextResultActions
            text={JSON.stringify(records, null, 2)}
            downloadName={`dns-${name}-${type}.json`}
          />
          <RunnerNote>{String(out.note ?? "")}</RunnerNote>
        </div>
      ) : null}
      <RunnerNote>{t("dns.note")}</RunnerNote>
    </div>
  );
}

export function TlsCertInspectRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [host, setHost] = useState("nebutra.com");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { host });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const tone: ShellTone = out?.expired
    ? "danger"
    : typeof out?.daysRemaining === "number" && out.daysRemaining < 30
      ? "warning"
      : out
        ? "success"
        : "neutral";

  return (
    <div className="space-y-4">
      <Input
        label={t("tls.host")}
        id="tls-host"
        value={host}
        onChange={(e) => setHost(e.target.value)}
        className="font-mono"
        placeholder="example.com"
      />
      <Button
        type="button"
        variant="ink"
        onClick={() => void run()}
        disabled={loading || !host.trim()}
      >
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <div className="space-y-3">
          <ShellVerdict
            tone={tone}
            headline={
              out.expired
                ? t("tls.expired")
                : t("tls.validDays", { n: String(out.daysRemaining ?? "—") })
            }
            caveat={String(out.note ?? "")}
          />
          <MetaCards
            items={[
              { label: "validTo", value: String(out.validTo ?? "—") },
              { label: "validFrom", value: String(out.validFrom ?? "—") },
              {
                label: "subject",
                value: JSON.stringify(out.subject ?? {}),
              },
              {
                label: "issuer",
                value: JSON.stringify(out.issuer ?? {}),
              },
              { label: "fingerprint256", value: String(out.fingerprint256 ?? "—") },
            ]}
          />
          {Array.isArray(out.subjectAltNames) && out.subjectAltNames.length > 0 ? (
            <pre className="overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs">
              {(out.subjectAltNames as string[]).join("\n")}
            </pre>
          ) : null}
        </div>
      ) : null}
      <RunnerNote>{t("tls.note")}</RunnerNote>
    </div>
  );
}

export function MyIpRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, {});
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("myIp.refresh")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <RunnerPanel>
          <p className="font-mono text-3xl font-bold tabular-nums">{String(out.clientIp ?? "—")}</p>
          <div className="mt-3">
            <MetaCards
              items={[
                { label: "userAgent", value: String(out.userAgent ?? "—") },
                { label: "acceptLanguage", value: String(out.acceptLanguage ?? "—") },
                {
                  label: "forwardedChain",
                  value: Array.isArray(out.forwardedChain)
                    ? (out.forwardedChain as string[]).join(" → ")
                    : "—",
                },
              ]}
            />
          </div>
          <RunnerNote>{String(out.note ?? "")}</RunnerNote>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("myIp.note")}</RunnerNote>
    </div>
  );
}

export function MermaidRenderRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(MERMAID_SAMPLE);
  const [svg, setSvg] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Human path: render in the browser (real DOM).
   * Agent path: same toolId with mode=svg uses Playwright on the host.
   */
  const runClient = async (source = text) => {
    if (!source.trim()) {
      setSvg("");
      setMeta("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      await mermaid.parse(source);
      const id = `mmd_${Date.now().toString(36)}`;
      const { svg: out } = await mermaid.render(id, source);
      setSvg(out);
      setMeta(`client · ${out.length} chars`);
      // Server parse keeps agent/API contract warm (ignore SVG cost for humans).
      void invokeForge(toolId, { text: source, mode: "parse_only" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSvg("");
    } finally {
      setLoading(false);
    }
  };

  const live = useDebouncedCallback((source: string) => {
    void runClient(source);
  }, 400);

  useEffect(() => {
    live(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          label={t("mermaid.source")}
          id="mmd-src"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="font-mono text-sm"
        />
        <div className="space-y-2">
          <p className="text-xs text-[var(--neutral-10)]">
            {loading ? t("common.running") : t("common.liveHint")}
            {meta ? ` · ${meta}` : ""}
          </p>
          <RunnerError>{error}</RunnerError>
          {svg ? (
            <div
              className="overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4"
              // mermaid SVG is produced client-side with securityLevel=strict
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <ShellNote>{t("mermaid.idle")}</ShellNote>
          )}
          {svg ? (
            <TextResultActions text={svg} downloadName="diagram.svg" contentType="image/svg+xml" />
          ) : null}
        </div>
      </div>
      <RunnerNote>{t("mermaid.note")}</RunnerNote>
    </div>
  );
}

export function ColorDeltaERunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [a, setA] = useState("#0033FE");
  const [b, setB] = useState("#0BF1C3");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const run = async (ca = a, cb = b) => {
    setError("");
    const r = await invokeForge(toolId, { a: ca, b: cb });
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOut(r.output);
  };

  const live = useDebouncedCallback((ca: string, cb: string) => {
    void run(ca, cb);
  }, 220);

  useEffect(() => {
    live(a, b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b]);

  const hexA =
    out && typeof out.a === "object" && out.a && "hex" in (out.a as object)
      ? String((out.a as { hex: string }).hex)
      : a;
  const hexB =
    out && typeof out.b === "object" && out.b && "hex" in (out.b as object)
      ? String((out.b as { hex: string }).hex)
      : b;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="A"
            id="de-a"
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="font-mono min-w-[8rem]"
          />
          <input
            data-allow-native
            type="color"
            aria-label="color A"
            value={/^#[0-9a-fA-F]{6}$/.test(hexA) ? hexA : "#0033FE"}
            onChange={(e) => setA(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border border-[var(--neutral-7)] bg-transparent p-1"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="B"
            id="de-b"
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="font-mono min-w-[8rem]"
          />
          <input
            data-allow-native
            type="color"
            aria-label="color B"
            value={/^#[0-9a-fA-F]{6}$/.test(hexB) ? hexB : "#0BF1C3"}
            onChange={(e) => setB(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border border-[var(--neutral-7)] bg-transparent p-1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div
          className="h-16 flex-1 rounded-lg border border-[var(--neutral-6)]"
          style={{ background: hexA }}
        />
        <div
          className="h-16 flex-1 rounded-lg border border-[var(--neutral-6)]"
          style={{ background: hexB }}
        />
      </div>
      <RunnerError>{error}</RunnerError>
      {out ? (
        <ShellVerdict
          tone={
            out.verdict === "imperceptible" || out.verdict === "close"
              ? "success"
              : out.verdict === "noticeable"
                ? "warning"
                : "danger"
          }
          headline={`ΔE₀₀ ${String(out.deltaE00)} · ${String(out.verdict)}`}
          caveat={String(out.note ?? "")}
        />
      ) : null}
      <RunnerNote>{t("colorDeltaE.note")}</RunnerNote>
    </div>
  );
}

export function DbmlParseRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return (
    <InstantTransformShell<{
      tableCount: number;
      refCount: number;
      tables: Array<{ name: string; columns: number; indexes: number }>;
      enums: string[];
      note?: string;
    }>
      engine={{ toolId }}
      inputKind="block"
      inputLabel={t("dbml.source")}
      sample={DBML_SAMPLE}
      rows={14}
      note={t("dbml.parseNote")}
      buildInput={(text) => (text.trim() ? { text } : null)}
      idle={<ShellNote>{t("common.liveHint")}</ShellNote>}
      exit={(o) => ({
        text: o.tables.map((x) => `${x.name}\t${x.columns} cols`).join("\n"),
        filename: "dbml-tables.tsv",
      })}
      renderResult={(o) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <ShellBadge tone="info">tables {o.tableCount}</ShellBadge>
            <ShellBadge>refs {o.refCount}</ShellBadge>
            <ShellBadge>enums {o.enums.length}</ShellBadge>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-[var(--neutral-10)]">
                  <th className="px-3 py-2">table</th>
                  <th className="px-3 py-2">columns</th>
                  <th className="px-3 py-2">indexes</th>
                </tr>
              </thead>
              <tbody>
                {o.tables.map((row) => (
                  <tr key={row.name}>
                    <td className="px-3 py-2 font-mono">{row.name}</td>
                    <td className="px-3 py-2 tabular-nums">{row.columns}</td>
                    <td className="px-3 py-2 tabular-nums">{row.indexes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <RunnerNote>{o.note}</RunnerNote>
        </div>
      )}
    />
  );
}

export function DbmlToSqlRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(DBML_SAMPLE);
  const [dialect, setDialect] = useState("postgres");
  const [sql, setSql] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { text, dialect });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSql(String(r.output.sql ?? ""));
  };

  return (
    <div className="space-y-4">
      <Textarea
        label={t("dbml.source")}
        id="dbml-sql-src"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="font-mono text-sm"
      />
      <RunnerSelect
        id="dbml-dialect"
        label={t("dbml.dialect")}
        value={dialect}
        onChange={setDialect}
      >
        <option value="postgres">PostgreSQL</option>
        <option value="mysql">MySQL</option>
        <option value="mssql">MSSQL</option>
        <option value="oracle">Oracle</option>
      </RunnerSelect>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {sql ? (
        <>
          <TextResultActions text={sql} downloadName={`schema.${dialect}.sql`} />
          <pre className="max-h-96 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs">
            {sql}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("dbml.convertNote")}</RunnerNote>
    </div>
  );
}

export function SqlToDbmlRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(
    `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE
);`,
  );
  const [dialect, setDialect] = useState("postgres");
  const [dbml, setDbml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { text, dialect });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setDbml(String(r.output.dbml ?? ""));
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="SQL DDL"
        id="sql-dbml-src"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="font-mono text-sm"
      />
      <RunnerSelect
        id="sql-dialect"
        label={t("dbml.dialect")}
        value={dialect}
        onChange={setDialect}
      >
        <option value="postgres">PostgreSQL</option>
        <option value="mysql">MySQL</option>
        <option value="mssql">MSSQL</option>
        <option value="oracle">Oracle</option>
      </RunnerSelect>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("common.running") : t("common.run")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {dbml ? (
        <>
          <TextResultActions text={dbml} downloadName="schema.dbml" />
          <pre className="max-h-96 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs">
            {dbml}
          </pre>
        </>
      ) : null}
      <RunnerNote>{t("dbml.convertNote")}</RunnerNote>
    </div>
  );
}
