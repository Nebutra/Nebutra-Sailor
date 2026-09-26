import { AnimatedSpan, Terminal, TypingAnimation } from "@nebutra/ui/primitives";

export function TerminalDemo() {
  return (
    <div className="max-w-2xl px-4 py-8 w-full">
      <Terminal>
        <TypingAnimation>&gt; pnpm install @nebutra/ui</TypingAnimation>

        <AnimatedSpan className="text-success-strong">
          ✔ Packages installed successfully.
        </AnimatedSpan>

        <TypingAnimation>&gt; nebutra start dev</TypingAnimation>

        <AnimatedSpan className="text-info">ℹ Starting development server...</AnimatedSpan>

        <AnimatedSpan className="text-success-strong">
          ✔ Ready on http://localhost:3000
        </AnimatedSpan>
      </Terminal>
    </div>
  );
}
