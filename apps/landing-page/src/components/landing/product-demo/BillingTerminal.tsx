import { AnimatedSpan, TypingAnimation } from "@nebutra/ui/primitives";

export function BillingTerminal() {
  return (
    <div
      key="billing-term"
      className="font-mono text-xs md:text-sm leading-relaxed flex flex-col gap-2 h-full justify-between"
    >
      <div>
        <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
          &gt; stripe listen --forward-to localhost
        </TypingAnimation>
        <AnimatedSpan delay={1200} className="text-amber-600 dark:text-amber-400 mt-2">
          ⚠ Ready! Waiting for events...
        </AnimatedSpan>
        <AnimatedSpan delay={2500} className="text-primary dark:text-blue-400 mt-5">
          ↳ [Webhook] customer.subscription.created - cus_9173x
        </AnimatedSpan>
        <AnimatedSpan delay={3200} className="text-emerald-600 dark:text-emerald-400">
          {"  "}✔ Successfully provisioned 'Enterprise' seat limits.
        </AnimatedSpan>
        <AnimatedSpan delay={4000} className="text-primary dark:text-blue-400 mt-3">
          ↳ [Webhook] invoice.paid - inv_12x - $4,200.00
        </AnimatedSpan>
        <AnimatedSpan delay={4800} className="text-emerald-600 dark:text-emerald-400">
          {"  "}✔ Payment recorded in Postgres. Emitting internal event.
        </AnimatedSpan>
      </div>

      <AnimatedSpan delay={5500} className="mt-8">
        <div className="flex items-center justify-between pt-4 border-t border-border/20 dark:border-white/10">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-sans font-bold">
            End-to-End Encrypted
          </span>
          <button className="px-4 py-2 rounded-md bg-background dark:bg-zinc-900 border border-border/50 dark:border-white/10 text-xs font-mono font-bold text-foreground hover:bg-muted/50 transition-colors shadow-sm flex items-center gap-2 cursor-default group">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Listening on :4242
          </button>
        </div>
      </AnimatedSpan>
    </div>
  );
}
