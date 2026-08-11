import { AnimatedSpan, TypingAnimation } from "@nebutra/ui/primitives";

import { InvoiceCard } from "./InvoiceCard";

export function BillingTerminal() {
  return (
    <div
      key="billing-term"
      className="font-mono text-xs md:text-sm leading-relaxed flex flex-col gap-2 h-full justify-between"
    >
      <div className="flex flex-col gap-2 relative z-20">
        <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
          &gt; stripe listen --forward-to localhost
        </TypingAnimation>
        <AnimatedSpan delay={1200} className="text-amber-600 dark:text-amber-400">
          ⚠ Ready! Waiting for events...
        </AnimatedSpan>

        <AnimatedSpan delay={2500} className="text-primary dark:text-blue-400 mt-2">
          ↳ [Webhook] customer.subscription.created
        </AnimatedSpan>
        <AnimatedSpan delay={3200} className="text-success">
          {"  "}✔ Provisioned limits.
        </AnimatedSpan>

        <AnimatedSpan delay={4000} className="text-primary dark:text-blue-400 mt-2">
          ↳ [Webhook] invoice.paid - $4,200.00
        </AnimatedSpan>
        <AnimatedSpan delay={4800} className="text-success">
          {"  "}✔ Payment recorded. Emitting events.
        </AnimatedSpan>
      </div>

      {/* Visually stunning floating Invoice */}
      <div className="relative z-10 -mt-8 mx-auto w-full pt-4 max-w-[90%] pointer-events-none">
        <AnimatedSpan delay={3000}>
          <InvoiceCard />
        </AnimatedSpan>
      </div>

      <AnimatedSpan delay={5500} className="mt-auto relative z-20 pt-4">
        <div className="flex items-center justify-between border-t border-border/20 pt-4">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-sans font-bold">
            End-to-End Encrypted
          </span>
          <button
            type="button"
            className="px-4 py-1.5 rounded-full bg-background dark:bg-zinc-900 border border-border/50 text-[10px] font-mono font-bold text-foreground shadow-sm flex items-center gap-2 cursor-default group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Listening :4242
          </button>
        </div>
      </AnimatedSpan>
    </div>
  );
}
