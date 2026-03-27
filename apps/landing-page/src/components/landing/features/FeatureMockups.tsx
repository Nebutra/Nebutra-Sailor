import { Cpu, Shield, User } from "lucide-react";

export function MultiTenantMockup() {
  return (
    <div className="w-64 bg-background border border-border/50 shadow-xl rounded-xl overflow-hidden flex flex-col transform rotate-2 hover:rotate-0 transition-all duration-500">
      <div className="p-3 border-b border-border/50 bg-muted/30 flex justify-between items-center">
        <span className="text-xs font-semibold text-foreground">Team Members</span>
        <div className="h-4 w-12 bg-primary/20 rounded-md"></div>
      </div>
      <div className="p-3 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted border border-border shrink-0 overflow-hidden flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-2 w-16 bg-muted-foreground/40 rounded-full"></div>
              <div className="h-1.5 w-24 bg-muted/70 rounded-full"></div>
            </div>
            <div className="h-5 w-12 border border-border/50 rounded-full flex items-center justify-center">
              <div className="h-1.5 w-6 bg-muted-foreground/30 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BillingMockup() {
  return (
    <div className="w-72 bg-background border border-border/50 shadow-xl rounded-2xl p-4 flex gap-3 transform -rotate-1 hover:rotate-0 transition-all duration-500">
      <div className="flex-1 border border-border/40 rounded-xl p-4 flex flex-col items-center">
        <span className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
          Solo
        </span>
        <span className="text-xl font-black border-b border-border/50 pb-2 w-full text-center text-foreground">
          Free
        </span>
        <div className="w-full space-y-2 mt-4 flex flex-col items-center">
          <div className="h-1.5 w-10 bg-primary/40 rounded-full" />
          <div className="h-1.5 w-8 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
      <div className="flex-1 border border-primary/50 bg-primary/5 rounded-xl p-4 flex flex-col items-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 bg-primary rounded-bl-lg"></div>
        <span className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
          Startup
        </span>
        <span className="text-xl font-black border-b border-primary/20 pb-2 w-full text-center text-foreground">
          $799
        </span>
        <div className="w-full space-y-2 mt-4 flex flex-col items-center">
          <div className="h-1.5 w-10 bg-primary/40 rounded-full" />
          <div className="h-1.5 w-12 bg-primary/40 rounded-full" />
          <div className="h-1.5 w-8 bg-primary/40 rounded-full" />
        </div>
        <div className="mt-5 h-6 w-full bg-primary rounded-lg flex items-center justify-center">
          <span className="text-[8px] font-bold text-primary-foreground uppercase">Active</span>
        </div>
      </div>
    </div>
  );
}

export function DXMockup() {
  return (
    <div className="w-80 bg-[#0d1117] border border-border/50 shadow-2xl rounded-xl overflow-hidden transform rotate-1 hover:rotate-0 transition-all duration-500">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></div>
        <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></div>
      </div>
      <div className="p-5 font-mono text-[11px] leading-relaxed text-[#c9d1d9]">
        <div>
          <span className="text-[#ff7b72]">import</span> {`{ Hono }`}{" "}
          <span className="text-[#ff7b72]">from</span>{" "}
          <span className="text-[#a5d6ff]">'hono'</span>;
        </div>
        <div className="mt-2">
          <span className="text-[#ff7b72]">const</span> app ={" "}
          <span className="text-[#ff7b72]">new</span> <span className="text-[#d2a8ff]">Hono</span>
          ();
        </div>
        <div className="mt-3">
          app.<span className="text-[#d2a8ff]">get</span>(
          <span className="text-[#a5d6ff]">'/api/health'</span>, (c){" "}
          <span className="text-[#ff7b72]">=&gt;</span> {`{`}
        </div>
        <div className="pl-4">
          <span className="text-[#ff7b72]">return</span> c.
          <span className="text-[#d2a8ff]">json</span>({`{ status: `}
          <span className="text-[#a5d6ff]">'ok'</span> {`}`});
        </div>
        <div>{`});`}</div>
      </div>
    </div>
  );
}

export function SecurityMockup() {
  return (
    <div className="w-72 bg-background border border-border/50 shadow-xl rounded-xl overflow-hidden transform -rotate-2 hover:rotate-0 transition-all duration-500">
      <div className="p-3 bg-muted/50 border-b border-border/50 flex items-center justify-between">
        <span className="text-xs font-bold font-mono text-foreground">WAF Firewall Logs</span>
        <Shield className="h-4 w-4 text-emerald-500" />
      </div>
      <div className="divide-y divide-border/30 text-[10px] font-mono">
        <div className="p-2.5 flex items-center gap-3">
          <span className="text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded">
            BLOCKED
          </span>
          <span className="text-foreground truncate flex-1">SQL Injection Attempt</span>
        </div>
        <div className="p-2.5 flex items-center gap-3">
          <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
            ALLOWED
          </span>
          <span className="text-foreground truncate flex-1">GET /api/v1/users</span>
        </div>
        <div className="p-2.5 flex items-center gap-3">
          <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
            THROTTLE
          </span>
          <span className="text-foreground truncate flex-1">Rate Limit Exceeded</span>
        </div>
      </div>
    </div>
  );
}

export function AIMockup() {
  return (
    <div className="w-64 bg-background border border-border/50 shadow-xl rounded-xl overflow-hidden flex flex-col transform rotate-1 hover:rotate-0 transition-all duration-500 h-40">
      <div className="flex-1 p-3 space-y-4 overflow-hidden text-[11px]">
        <div className="flex gap-2 w-full">
          <div className="h-6 w-6 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
            <User className="h-3 w-3 text-primary" />
          </div>
          <div className="bg-muted px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] text-muted-foreground leading-relaxed">
            Generate a secure API endpoint.
          </div>
        </div>
        <div className="flex gap-2 w-full justify-end">
          <div className="bg-primary/10 border border-primary/20 px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%] text-foreground">
            <div className="h-2 w-32 bg-primary/30 rounded-full mb-1.5"></div>
            <div className="h-2 w-24 bg-primary/20 rounded-full"></div>
          </div>
          <div className="h-6 w-6 rounded-full bg-primary shrink-0 flex items-center justify-center shadow-md">
            <Cpu className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataMockup() {
  return (
    <div className="w-72 bg-background border border-border/50 shadow-xl rounded-xl p-5 flex flex-col transform -rotate-1 hover:rotate-0 transition-all duration-500 h-44">
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
            Active Users
          </div>
          <div className="text-3xl font-black text-foreground">12.4k</div>
        </div>
        <div className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
          +24%
        </div>
      </div>
      <div className="flex-1 flex items-end justify-between gap-1.5 mt-auto h-full">
        {[40, 60, 30, 80, 50, 90, 70, 100].map((h, i) => (
          <div
            key={i}
            className="w-full h-full bg-primary/10 rounded-t-sm relative group overflow-hidden"
          >
            <div
              className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all duration-700 ease-out group-hover:brightness-125"
              style={{ height: `${h}%` }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
}
