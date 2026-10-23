"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const ITEMS = [
  {
    value: "shipping",
    title: "Shipping",
    body: "Orders leave the warehouse within two business days.",
  },
  { value: "billing", title: "Billing", body: "Invoices are issued on the first of the month." },
  { value: "privacy", title: "Privacy", body: "Data stays in the region you picked at signup." },
] as const;

function sizesOf(derived: DemoProps["derived"]) {
  return derived.axes.size?.length ? derived.axes.size : ["default", "small"];
}

export function Playground({ derived }: DemoProps) {
  const sizes = sizesOf(derived);
  const knobs: Knob[] = [
    { name: "multiple", type: "boolean", defaultValue: false },
    { name: "size", type: "select", options: sizes, defaultValue: "default" },
    {
      name: "defaultOpen",
      type: "select",
      options: ["none", ...ITEMS.map((item) => item.value)],
      defaultValue: "shipping",
    },
    { name: "firstTitle", label: "first title", type: "text", defaultValue: "Shipping" },
    { name: "disableBilling", type: "boolean", defaultValue: false },
    { name: "keepMounted", type: "boolean", defaultValue: false },
    { name: "loopFocus", type: "boolean", defaultValue: true },
  ];

  return (
    <ComponentPlayground
      caption="Open sections, then press the arrow keys from a trigger to move between them; Home and End jump to the ends. Disabled items are skipped by the arrows. Turn on multiple to keep several open."
      code={(v) => {
        const titleOf = (value: string, title: string) =>
          value === "shipping" ? String(v.firstTitle) || title : title;
        return snippet({
          imports: [
            {
              names: ["Accordion", "AccordionContent", "AccordionItem", "AccordionTrigger"],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: jsx({
            name: "Accordion",
            defaults: { multiple: false, loopFocus: true },
            props: {
              defaultValue: v.defaultOpen === "none" ? undefined : raw(`["${v.defaultOpen}"]`),
              multiple: v.multiple,
              loopFocus: v.loopFocus,
            },
            children: ITEMS.map((item) =>
              jsx({
                name: "AccordionItem",
                defaults: { disabled: false },
                props: {
                  value: item.value,
                  disabled: item.value === "billing" ? v.disableBilling : false,
                },
                children: [
                  jsx({
                    name: "AccordionTrigger",
                    defaults: { size: "default" },
                    props: { size: String(v.size) },
                    children: titleOf(item.value, item.title),
                  }),
                  jsx({
                    name: "AccordionContent",
                    defaults: { size: "default", keepMounted: false },
                    props: { size: String(v.size), keepMounted: v.keepMounted },
                    children: item.body,
                  }),
                ],
              }),
            ),
          }),
        });
      }}
      knobs={knobs}
      render={(v) => (
        <div className="w-80 max-w-full break-words">
          <Accordion
            defaultValue={v.defaultOpen === "none" ? [] : [String(v.defaultOpen)]}
            key={`${v.defaultOpen}-${v.multiple}`}
            loopFocus={Boolean(v.loopFocus)}
            multiple={Boolean(v.multiple)}
          >
            {ITEMS.map((item) => (
              <AccordionItem
                disabled={item.value === "billing" ? Boolean(v.disableBilling) : false}
                key={item.value}
                value={item.value}
              >
                <AccordionTrigger size={v.size as never}>
                  {item.value === "shipping" ? String(v.firstTitle) || item.title : item.title}
                </AccordionTrigger>
                <AccordionContent keepMounted={Boolean(v.keepMounted)} size={v.size as never}>
                  {item.body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "closed", label: "Closed" },
        { id: "open", label: "Open" },
        { id: "disabled", label: "Disabled" },
      ]}
      note="Sizes come from AccordionTrigger and AccordionContent. Open is the plus turned to a cross with the panel showing; Disabled dims the trigger and ignores presses. Accordion has no loading or error state of its own."
      render={(size, state) => (
        <div className="w-56">
          <Accordion defaultValue={state === "open" ? ["shipping"] : []}>
            <AccordionItem disabled={state === "disabled"} value="shipping">
              <AccordionTrigger size={size as never}>Shipping</AccordionTrigger>
              <AccordionContent size={size as never}>Ships within two days.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
      rows={sizesOf(derived).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
