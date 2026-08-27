"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@nebutra/ui/primitives";

export function AccordionCompactDemo() {
  return (
    <Accordion multiple={false} className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger size="small">Compact Question</AccordionTrigger>
        <AccordionContent size="small">Compact content with reduced padding.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
