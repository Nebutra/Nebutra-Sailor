"use client";

import { Section } from "@nebutra/ui/layout";

export function SectionDemo() {
  return (
    <div className="w-full px-6">
      <Section label="Usage" className="border-border border-b">
        <h2 className="font-semibold text-foreground text-lg">Usage</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          42,180 of 100,000 requests this billing period.
        </p>
      </Section>
      <Section label="Invoices">
        <h2 className="font-semibold text-foreground text-lg">Invoices</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Your next invoice is issued on October 1.
        </p>
      </Section>
    </div>
  );
}
