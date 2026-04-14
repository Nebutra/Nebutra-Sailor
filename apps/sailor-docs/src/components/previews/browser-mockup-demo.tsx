import { Browser } from "@nebutra/ui/primitives";

export function BrowserMockupDemo() {
  return (
    <div className="max-w-3xl px-4 py-8 w-full">
      <Browser address="nebutra.dev" className="h-[400px]">
        <div className="flex h-full w-full items-center justify-center bg-muted/50">
          <p className="text-muted-foreground">Your SaaS content goes here</p>
        </div>
      </Browser>
    </div>
  );
}
