import { AnimatedSpan, TypingAnimation } from "@nebutra/ui/primitives";

import { RoleSwitcher, TenantDiagram } from "./WorkspacesVisuals";

export function WorkspacesTerminal() {
  return (
    <div
      key="workspaces-term"
      className="font-mono text-xs md:text-sm leading-relaxed flex flex-col gap-2 h-full"
    >
      <div className="flex flex-col gap-2 relative z-20">
        <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
          &gt; nebutra rbac --tenant org_kjl9a
        </TypingAnimation>
        <AnimatedSpan delay={1200} className="text-cyan-600 dark:text-cyan-400">
          ⚡ Establishing multi-tenant DB proxy...
        </AnimatedSpan>

        <AnimatedSpan delay={2000} className="text-emerald-600 dark:text-emerald-400 font-medium">
          ✔ [200 OK] Connected to 'Globex' cluster space.
        </AnimatedSpan>
      </div>

      {/* High-Fidelity Diagrams */}
      <div className="flex-1 mt-6 flex flex-col justify-center gap-8 relative z-10">
        <AnimatedSpan delay={2800} className="w-full">
          <TenantDiagram />
        </AnimatedSpan>

        <AnimatedSpan delay={3200} className="w-full">
          <RoleSwitcher />
        </AnimatedSpan>
      </div>

      <AnimatedSpan
        delay={4000}
        className="w-full mt-auto mb-2 text-center text-[10px] text-muted-foreground border-border/50 bg-background/50 rounded-lg p-2"
      >
        Row-Level Security (RLS) dynamically enforced by Identity JWT.
      </AnimatedSpan>
    </div>
  );
}
