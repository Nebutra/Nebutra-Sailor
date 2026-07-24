import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { Cards, Card as FumaCard } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import type { ReactNode } from "react";

// Mintlify <Tip> → fumadocs <Callout type="info">
export function Tip({ children, title }: { children?: ReactNode; title?: string }) {
  return (
    <Callout type="info" title={title}>
      {children}
    </Callout>
  );
}

// Mintlify <Warning> → fumadocs <Callout type="warning">
export function Warning({ children, title }: { children?: ReactNode; title?: string }) {
  return (
    <Callout type="warning" title={title}>
      {children}
    </Callout>
  );
}

// Mintlify <Info> → fumadocs <Callout type="info">
export function Info({ children, title }: { children?: ReactNode; title?: string }) {
  return (
    <Callout type="info" title={title}>
      {children}
    </Callout>
  );
}

// Mintlify <Note> → fumadocs <Callout>
export function Note({ children, title }: { children?: ReactNode; title?: string }) {
  return <Callout title={title}>{children}</Callout>;
}

// Mintlify <Check> → checkmark list item
export function Check({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-1">
      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
      <span>{children}</span>
    </div>
  );
}

// Mintlify <AccordionGroup> → fumadocs <Accordions>
export function AccordionGroup({ children }: { children?: ReactNode }) {
  return (
    <Accordions type="single" collapsible>
      {children}
    </Accordions>
  );
}

// Mintlify <Card> → fumadocs Card (icon string prop is dropped gracefully)
export function Card({
  title,
  icon: _icon,
  href,
  children,
}: {
  title?: ReactNode;
  icon?: string;
  href?: string;
  children?: ReactNode;
}) {
  return <FumaCard title={title ?? ""} href={href} description={children} />;
}

// Mintlify <CardGroup> → fumadocs Cards grid
export function CardGroup({ children }: { children?: ReactNode }) {
  return <Cards>{children}</Cards>;
}

// Re-export fumadocs Steps/Step/Accordion/Accordions
export { Accordion, Accordions, Step, Steps };
