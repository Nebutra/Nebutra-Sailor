"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@nebutra/ui/primitives";

export function AccordionDisabledDemo() {
  return (
    <Accordion multiple={false} className="w-full">
      <AccordionItem value="item-1" disabled>
        <AccordionTrigger>Disabled Section</AccordionTrigger>
        <AccordionContent>This will not open.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
