"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@nebutra/ui/primitives";

export function AccordionControlledDemo() {
  return (
    <Accordion multiple={false} defaultValue={["item-1"]} className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Controlled Item</AccordionTrigger>
        <AccordionContent>This accordion is controlled.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
