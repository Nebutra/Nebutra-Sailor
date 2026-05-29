import { CheckCircle as CheckCircle2, Cpu, Fingerprint, Terminal } from "@nebutra/icons";

const SECURITY_ROWS = [
  { name: "posts:write", a: true, u: false },
  { name: "billing:read", a: true, u: false },
  { name: "profile:edit", a: true, u: true },
] as const;

const DATA_BARS = [
  { id: "bar-30", height: 30, highlighted: false },
  { id: "bar-50-a", height: 50, highlighted: false },
  { id: "bar-40", height: 40, highlighted: false },
  { id: "bar-70", height: 70, highlighted: false },
  { id: "bar-50-b", height: 50, highlighted: false },
  { id: "bar-90", height: 90, highlighted: false },
  { id: "bar-60", height: 60, highlighted: false },
  { id: "bar-100", height: 100, highlighted: true },
] as const;

export function MultiTenantMockup() {
  return (
    <div
      className="relative top-4 w-full max-w-[340px] overflow-hidden rounded-t-[1.5rem] border border-b-0 border-[var(--neutral-6)] bg-background font-mono text-[11px] leading-relaxed transition-all duration-700 group-hover:top-2 dark:bg-background"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/30 px-4 py-3 dark:bg-muted/30">
        <div className="h-2.5 w-2.5 rounded-full bg-border dark:bg-[var(--neutral-4)]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-border dark:bg-[var(--neutral-4)]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-border dark:bg-[var(--neutral-4)]"></div>
        <span className="ml-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-[var(--neutral-10)]">
          query.ts
        </span>
      </div>
      <div className="p-6 text-foreground dark:text-[var(--neutral-11)]">
        <div className="mb-3 text-muted-foreground dark:text-[var(--neutral-10)]">
          {"// Enterprise-grade RLS enforced transparently"}
        </div>
        <div>
          <span className="text-[var(--brand-primary)]">const</span> data{" "}
          <span className="text-[var(--brand-primary)]">=</span>{" "}
          <span className="text-[var(--brand-tertiary)]">await</span> prisma.post.findMany(
          {`{`}
        </div>
        <div className="pl-4 mt-1">where: {`{`}</div>
        {/* Glow highlight for tenant enforcement */}
        <div className="my-1 border-l-[3px] border-[var(--green-8)] bg-[var(--green-3)] px-2 py-1 pl-8 font-bold text-[var(--green-11)]">
          tenantId: ctx.tenant.id
        </div>
        <div className="pl-4">{`}`}</div>
        <div className="mt-1">{`});`}</div>
      </div>
    </div>
  );
}

export function AIMockup() {
  return (
    <div className="relative w-full max-w-[340px] h-[180px] flex items-center justify-between px-2">
      {/* Vercel-style clean nodes */}
      <div className="z-10 flex h-12 w-12 items-center justify-center rounded-[var(--radius-2xl)] border border-border/60 bg-background shadow-sm dark:bg-background">
        <Cpu className="h-5 w-5 text-foreground dark:text-[var(--neutral-12)]" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg className="w-full h-full" overflow="visible" aria-hidden="true" focusable="false">
          {/* Vercel uses extremely crisp, ultra-thin solid lines instead of thick dashed ones */}
          <path
            d="M 60 90 C 130 90, 150 40, 220 40"
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
          <path
            d="M 60 90 C 130 90, 150 90, 220 90"
            fill="none"
            stroke="currentColor"
            className="text-primary/50 dark:text-muted-foreground/45"
            strokeWidth="1.5"
          />
          <path
            d="M 60 90 C 130 90, 150 140, 220 140"
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="z-10 flex flex-col gap-4">
        {["OpenAI", "Anthropic", "DeepSeek"].map((provider, i) => (
          <div
            key={provider}
            className={`flex h-8 items-center justify-center rounded-full border px-4 text-[11px] font-bold tracking-wide transition-all duration-300 ${i === 1 ? "border-primary bg-primary text-primary-foreground shadow-md dark:border-foreground dark:bg-foreground dark:text-background" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50 dark:bg-background dark:text-[var(--neutral-10)] dark:hover:bg-muted/40"}`}
          >
            {provider}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecurityMockup() {
  return (
    <div
      className="relative top-6 w-full max-w-[320px] overflow-hidden rounded-t-[1.5rem] border border-b-0 border-[var(--neutral-6)] bg-background font-mono transition-all duration-700 group-hover:top-4 dark:bg-background"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:bg-muted/20 dark:text-[var(--neutral-10)]">
        <Fingerprint className="w-3.5 h-3.5" />
        Permission Matrix
      </div>
      <div className="divide-y divide-border/50 text-[11px]">
        {SECURITY_ROWS.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30 dark:hover:bg-muted/40"
          >
            <div className="font-medium text-foreground dark:text-[var(--neutral-11)]">
              {row.name}
            </div>
            <div className="flex gap-6 pr-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground/50 dark:text-[var(--neutral-9)]">
                  Admin
                </span>
                {row.a ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground dark:text-[var(--neutral-12)]" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-border/50" />
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground/50 dark:text-[var(--neutral-9)]">
                  User
                </span>
                {row.u ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground dark:text-[var(--neutral-12)]" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-border/50" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BillingMockup() {
  return (
    <div
      className="relative top-4 w-full max-w-[320px] overflow-hidden rounded-t-[1.5rem] border border-b-0 border-[var(--neutral-6)] bg-background transition-all duration-700 group-hover:top-2 dark:bg-background"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="border-b border-border/60 bg-gradient-to-b from-[var(--green-2)] to-transparent p-6 pb-8">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-[var(--neutral-10)]">
          Monthly Recurring Revenue
        </div>
        <div
          className="text-2xl font-semibold tabular-nums text-foreground dark:text-[var(--neutral-12)] md:text-3xl"
          style={{ letterSpacing: "var(--tracking-tight)" }}
        >
          $12,400
          <span className="ml-2 rounded border border-[var(--green-8)]/20 bg-[var(--green-3)] px-2 py-0.5 align-middle text-sm font-bold text-[var(--green-11)]">
            +12%
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-[var(--neutral-10)]">
          Active Subscribers
        </div>
        <div
          className="text-2xl font-semibold tabular-nums text-foreground dark:text-[var(--neutral-12)]"
          style={{ letterSpacing: "var(--tracking-tight)" }}
        >
          847
        </div>
      </div>
    </div>
  );
}

export function DXMockup() {
  return (
    <div
      className="relative top-4 w-full max-w-[360px] overflow-hidden rounded-t-[1.5rem] border border-b-0 border-[var(--neutral-6)] bg-background font-mono text-[11px] leading-relaxed transition-all duration-700 group-hover:top-2 dark:bg-background"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="flex items-center gap-4 border-b border-border/60 bg-muted/30 px-5 py-3 dark:bg-muted/30">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground dark:text-[var(--neutral-10)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-[var(--neutral-10)]">
          Router.ts
        </span>
      </div>
      <div className="p-6 text-foreground dark:text-[var(--neutral-11)]">
        <span className="text-[var(--brand-primary)]">import</span> {`{ Hono }`}{" "}
        <span className="text-[var(--brand-primary)]">from</span>{" "}
        <span className="text-[var(--green-11)]">{"'hono';"}</span>
        <div className="mt-4 text-muted-foreground dark:text-[var(--neutral-9)]">
          {"// Fully typed edge-ready RPC"}
        </div>
        <div>
          <span className="text-[var(--brand-primary)]">const</span> app ={" "}
          <span className="text-[var(--brand-primary)]">new</span>{" "}
          <span className="text-[var(--brand-tertiary)]">Hono</span>().
          <span className="text-[var(--amber-11)]">get</span>(
        </div>
        <div className="pl-4 pt-1">
          <span className="text-[var(--green-11)]">'/'</span>, (c){" "}
          <span className="text-[var(--brand-primary)]">=&gt;</span> c.json({`{ ok: `}
          <span className="text-[var(--brand-primary)]">true</span> {`}`})
        </div>
        <div>)</div>
        <div className="mt-4">
          <span className="text-[var(--brand-primary)]">export type</span> AppRouter ={" "}
          <span className="text-[var(--brand-primary)]">typeof</span> app;
        </div>
      </div>
    </div>
  );
}

export function DataMockup() {
  return (
    <div className="w-full max-w-[320px] h-[200px] flex items-end justify-between gap-1 mt-auto relative top-2">
      {DATA_BARS.map((bar) => (
        <div
          key={bar.id}
          className="group/bar relative w-full overflow-hidden rounded-t-sm bg-muted/20 dark:bg-muted/30"
          style={{ height: "100%" }}
        >
          <div
            className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-700 ${bar.highlighted ? "bg-primary dark:bg-foreground" : "bg-primary/40 dark:bg-[var(--neutral-4)]"}`}
            style={{ height: `${bar.height}%` }}
          ></div>
        </div>
      ))}
    </div>
  );
}
