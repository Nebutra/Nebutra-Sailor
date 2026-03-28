import {
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Fingerprint,
  Shield,
  Terminal,
} from "lucide-react";

export function MultiTenantMockup() {
  return (
    <div className="w-full max-w-[340px] bg-background dark:bg-[#0A0A0A] border border-border/60 dark:border-white/10 shadow-2xl rounded-t-[1.5rem] border-b-0 overflow-hidden font-mono text-[11px] leading-relaxed relative top-4 group-hover:top-2 transition-all duration-700">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-muted/30 dark:bg-white/5 border-b border-border/60 dark:border-white/5">
        <div className="h-2.5 w-2.5 rounded-full bg-border dark:bg-zinc-700"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-border dark:bg-zinc-700"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-border dark:bg-zinc-700"></div>
        <span className="ml-3 text-muted-foreground dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
          query.ts
        </span>
      </div>
      <div className="p-6 text-foreground dark:text-zinc-300">
        <div className="text-muted-foreground dark:text-zinc-500 mb-3">
          {"// Enterprise-grade RLS enforced transparently"}
        </div>
        <div>
          <span className="text-primary dark:text-cyan-400">const</span> data{" "}
          <span className="text-primary dark:text-cyan-400">=</span>{" "}
          <span className="text-purple-600 dark:text-indigo-400">await</span> prisma.post.findMany(
          {`{`}
        </div>
        <div className="pl-4 mt-1">where: {`{`}</div>
        {/* Glow highlight for tenant enforcement */}
        <div className="pl-8 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 border-l-[3px] border-emerald-500 py-1 px-2 my-1">
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
      <div className="z-10 h-12 w-12 rounded-2xl bg-background dark:bg-[#0A0A0B] border border-border/60 dark:border-white/10 flex items-center justify-center shadow-sm">
        <Cpu className="h-5 w-5 text-foreground dark:text-zinc-200" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg className="w-full h-full" overflow="visible">
          {/* Vercel uses extremely crisp, ultra-thin solid lines instead of thick dashed ones */}
          <path
            d="M 60 90 C 130 90, 150 40, 220 40"
            fill="none"
            stroke="currentColor"
            className="text-border dark:text-white/10"
            strokeWidth="1"
          />
          <path
            d="M 60 90 C 130 90, 150 90, 220 90"
            fill="none"
            stroke="currentColor"
            className="text-primary/50 dark:text-white/30"
            strokeWidth="1.5"
          />
          <path
            d="M 60 90 C 130 90, 150 140, 220 140"
            fill="none"
            stroke="currentColor"
            className="text-border dark:text-white/10"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="z-10 flex flex-col gap-4">
        {["OpenAI", "Anthropic", "DeepSeek"].map((provider, i) => (
          <div
            key={provider}
            className={`h-8 px-4 rounded-full border flex items-center justify-center text-[11px] font-bold tracking-wide transition-all duration-300 ${i === 1 ? "bg-primary dark:bg-white border-primary dark:border-white text-primary-foreground dark:text-black shadow-md" : "bg-background dark:bg-[#0A0A0A] border-border/60 dark:border-white/10 text-muted-foreground dark:text-zinc-400 hover:bg-muted/50 dark:hover:bg-white/5"}`}
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
    <div className="w-full max-w-[320px] bg-background dark:bg-[#0A0A0A] border border-border/60 dark:border-white/10 shadow-2xl rounded-t-[1.5rem] border-b-0 overflow-hidden font-mono relative top-6 group-hover:top-4 transition-all duration-700">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60 dark:border-white/5 text-[10px] uppercase tracking-widest text-muted-foreground dark:text-zinc-500 font-bold bg-muted/20 dark:bg-white/[0.02]">
        <Fingerprint className="w-3.5 h-3.5" />
        Permission Matrix
      </div>
      <div className="divide-y divide-border/50 dark:divide-white/5 text-[11px]">
        {[
          { name: "posts:write", a: true, u: false },
          { name: "billing:read", a: true, u: false },
          { name: "profile:edit", a: true, u: true },
        ].map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 dark:hover:bg-white/5 transition-colors"
          >
            <div className="text-foreground dark:text-zinc-300 font-medium">{row.name}</div>
            <div className="flex gap-6 pr-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground/50 dark:text-zinc-600">
                  Admin
                </span>
                {row.a ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground dark:text-white" />
                ) : (
                  <div className="h-3.5 w-3.5 border border-border/50 dark:border-white/10 rounded-full" />
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground/50 dark:text-zinc-600">User</span>
                {row.u ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground dark:text-white" />
                ) : (
                  <div className="h-3.5 w-3.5 border border-border/50 dark:border-white/10 rounded-full" />
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
    <div className="w-full max-w-[320px] bg-background dark:bg-[#0A0A0A] border border-border/60 dark:border-white/10 shadow-2xl rounded-t-[1.5rem] border-b-0 overflow-hidden relative top-4 group-hover:top-2 transition-all duration-700">
      <div className="p-6 pb-8 border-b border-border/60 dark:border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="text-[11px] text-muted-foreground dark:text-zinc-500 font-semibold mb-1 uppercase tracking-wider">
          Monthly Recurring Revenue
        </div>
        <div className="text-4xl font-black text-foreground dark:text-white tracking-tighter">
          $12,400
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-bold ml-2 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 align-middle">
            +12%
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="text-[11px] text-muted-foreground dark:text-zinc-500 font-semibold mb-1 uppercase tracking-wider">
          Active Subscribers
        </div>
        <div className="text-2xl font-black text-foreground dark:text-white tracking-tighter">
          847
        </div>
      </div>
    </div>
  );
}

export function DXMockup() {
  return (
    <div className="w-full max-w-[360px] bg-background dark:bg-[#0A0A0A] border border-border/60 dark:border-white/10 shadow-2xl rounded-t-[1.5rem] border-b-0 overflow-hidden font-mono text-[11px] leading-relaxed relative top-4 group-hover:top-2 transition-all duration-700">
      <div className="flex items-center gap-4 px-5 py-3 bg-muted/30 dark:bg-white/5 border-b border-border/60 dark:border-white/5">
        <Terminal className="w-3.5 h-3.5 text-muted-foreground dark:text-zinc-500" />
        <span className="text-muted-foreground dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
          Router.ts
        </span>
      </div>
      <div className="p-6 text-foreground dark:text-zinc-300">
        <span className="text-primary dark:text-blue-400">import</span> {`{ Hono }`}{" "}
        <span className="text-primary dark:text-blue-400">from</span>{" "}
        <span className="text-emerald-600 dark:text-emerald-300">'hono'</span>;
        <div className="mt-4 text-muted-foreground dark:text-zinc-600">
          {"// Fully typed edge-ready RPC"}
        </div>
        <div>
          <span className="text-primary dark:text-blue-400">const</span> app ={" "}
          <span className="text-primary dark:text-blue-400">new</span>{" "}
          <span className="text-purple-600 dark:text-purple-300">Hono</span>().
          <span className="text-amber-600 dark:text-amber-200">get</span>(
        </div>
        <div className="pl-4 pt-1">
          <span className="text-emerald-600 dark:text-emerald-300">'/'</span>, (c){" "}
          <span className="text-primary dark:text-blue-400">=&gt;</span> c.json({`{ ok: `}
          <span className="text-primary dark:text-blue-400">true</span> {`}`})
        </div>
        <div>)</div>
        <div className="mt-4">
          <span className="text-primary dark:text-blue-400">export type</span> AppRouter ={" "}
          <span className="text-primary dark:text-blue-400">typeof</span> app;
        </div>
      </div>
    </div>
  );
}

export function DataMockup() {
  return (
    <div className="w-full max-w-[320px] h-[200px] flex items-end justify-between gap-1 mt-auto relative top-2">
      {[30, 50, 40, 70, 50, 90, 60, 100].map((h, i) => (
        <div
          key={i}
          className="w-full bg-muted/20 dark:bg-white/5 rounded-t-sm relative group/bar overflow-hidden"
          style={{ height: "100%" }}
        >
          <div
            className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-700 ${i === 7 ? "bg-primary dark:bg-white" : "bg-primary/40 dark:bg-zinc-700"}`}
            style={{ height: `${h}%` }}
          ></div>
        </div>
      ))}
    </div>
  );
}
