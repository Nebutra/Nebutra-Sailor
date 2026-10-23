"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  LONG_PARAGRAPH,
  Row,
  Stack,
  State,
} from "../demo-kit";

const FAQ = [
  { value: "shipping", title: "Shipping", body: "Orders leave the warehouse within two days." },
  { value: "billing", title: "Billing", body: "Invoices are issued on the first of the month." },
  { value: "privacy", title: "Privacy", body: "Data stays in the region you picked at signup." },
];

function Faq({
  size,
  disabledValue,
  keepMounted = false,
}: {
  size?: "default" | "small";
  disabledValue?: string;
  keepMounted?: boolean;
}) {
  return (
    <>
      {FAQ.map((item) => (
        <AccordionItem disabled={item.value === disabledValue} key={item.value} value={item.value}>
          <AccordionTrigger {...(size ? { size } : {})}>{item.title}</AccordionTrigger>
          <AccordionContent keepMounted={keepMounted} {...(size ? { size } : {})}>
            {item.body}
          </AccordionContent>
        </AccordionItem>
      ))}
    </>
  );
}

export default function AccordionDemo() {
  const [value, setValue] = React.useState<string[]>(["billing"]);

  return (
    <DemoPage>
      <State
        breaks="Two sections open at once without multiple, or a trigger that does not report aria-expanded. Open one, then another: the first closes."
        code={`<Accordion defaultValue={["shipping"]}>
  <AccordionItem value="shipping">
    <AccordionTrigger>Shipping</AccordionTrigger>
    <AccordionContent>Orders leave the warehouse within two days.</AccordionContent>
  </AccordionItem>
  <AccordionItem value="billing">
    <AccordionTrigger>Billing</AccordionTrigger>
    <AccordionContent>Invoices are issued on the first of the month.</AccordionContent>
  </AccordionItem>
</Accordion>`}
        id="default"
        note="Single mode: opening one section closes the open one. Open items are listed in defaultValue by their value."
        title="Default — one open at a time"
      >
        <div className="max-w-md">
          <Accordion defaultValue={["shipping"]}>
            <Faq />
          </Accordion>
        </div>
      </State>

      <State
        breaks="multiple dropped on the way to Base UI, so sections close each other when the page promised they would not."
        code={`<Accordion defaultValue={["shipping", "billing"]} multiple>
  …
</Accordion>`}
        id="multiple"
        note="With multiple, any number of sections stay open. Both are open to start."
        title="Multiple open"
      >
        <div className="max-w-md">
          <Accordion defaultValue={["shipping", "billing"]} multiple>
            <Faq />
          </Accordion>
        </div>
      </State>

      <State
        breaks="A controlled accordion whose value array and the visible state drift apart, so the page shows one thing and the URL or store says another."
        code={`const [value, setValue] = useState<string[]>(["billing"]);

<Accordion onValueChange={(next) => setValue(next as string[])} value={value}>
  …
</Accordion>`}
        id="controlled"
        note={`Controlled by the page. Open items: ${value.length > 0 ? value.join(", ") : "none"}.`}
        title="Controlled"
      >
        <Stack>
          <div className="max-w-md">
            <Accordion onValueChange={(next) => setValue(next as string[])} value={value}>
              <Faq />
            </Accordion>
          </div>
          <Row>
            <Button onClick={() => setValue(["privacy"])} size="sm" variant="outline">
              Open Privacy from outside
            </Button>
          </Row>
        </Stack>
      </State>

      <State
        breaks="A trigger and panel on different sizes, so the heading is 15px over padding sized for 14px text. The size prop is on both parts and has to be set on both."
        code={`<AccordionTrigger size="small">Shipping</AccordionTrigger>
<AccordionContent size="small">…</AccordionContent>`}
        id="sizes"
        note="default and small. Size is a prop on AccordionTrigger and on AccordionContent, not on the root."
        title="Sizes"
      >
        <Row align="start">
          <div className="w-72">
            <Accordion defaultValue={["shipping"]}>
              <Faq size="default" />
            </Accordion>
          </div>
          <div className="w-72">
            <Accordion defaultValue={["shipping"]}>
              <Faq size="small" />
            </Accordion>
          </div>
        </Row>
      </State>

      <State
        breaks="A disabled item that still looks pressable, or one that opens anyway. Billing is disabled: it is dimmed and the arrow keys step over it."
        code={`<AccordionItem disabled value="billing">…</AccordionItem>

<Accordion disabled>…</Accordion>`}
        id="disabled"
        note="Left: one disabled item. Right: the whole accordion disabled. The disabled trigger can still be reached with Tab; it does not open."
        title="Disabled — one item and the whole accordion"
      >
        <Row align="start">
          <div className="w-72">
            <Accordion defaultValue={["shipping"]}>
              <Faq disabledValue="billing" />
            </Accordion>
          </div>
          <div className="w-72">
            <Accordion defaultValue={["shipping"]} disabled>
              <Faq />
            </Accordion>
          </div>
        </Row>
      </State>

      <State
        breaks="Closed panels removed from the DOM, so browser find-in-page and crawlers cannot see the text. keepMounted on AccordionContent keeps it in the document while hidden."
        code={`<AccordionContent keepMounted>…</AccordionContent>`}
        id="keep-mounted"
        note="Every panel here is keepMounted: closed content stays in the DOM but is not visible. Without it, a closed panel is not rendered."
        title="Keep mounted"
      >
        <div className="max-w-md">
          <Accordion>
            <Faq keepMounted />
          </Accordion>
        </div>
      </State>

      <State
        breaks="A long title that overlaps the icon or pushes it out of the row, or a long unbroken string that scrolls the page sideways. The icon is shrink-0; the title has to wrap."
        id="overflow"
        note="A long title and a long panel in a narrow container."
        title="Overflow — long title and long body"
      >
        <div className="max-w-xs rounded-lg bg-background p-3">
          <Accordion defaultValue={["long"]}>
            <AccordionItem value="long">
              <AccordionTrigger>{LONG_LABEL}</AccordionTrigger>
              <AccordionContent>{LONG_PARAGRAPH}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="token">
              <AccordionTrigger>Deployment token</AccordionTrigger>
              <AccordionContent>
                <span className="break-all">
                  nbt_live_9f3a2c71d04e4b6c8a51f7e2b09d6a43c1e85f20b7a94d3e6c18
                </span>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </State>

      <State
        breaks="An open panel with nothing in it reads as a bug: the plus turns to a cross and nothing appears. An empty panel should say so, or the section should not exist."
        id="empty"
        note="Left: a panel with no content. Right: a panel that says it is empty."
        title="Empty panel"
      >
        <Row align="start">
          <div className="w-72">
            <Accordion defaultValue={["none"]}>
              <AccordionItem value="none">
                <AccordionTrigger>Audit log</AccordionTrigger>
                <AccordionContent>{null}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="w-72">
            <Accordion defaultValue={["some"]}>
              <AccordionItem value="some">
                <AccordionTrigger>Audit log</AccordionTrigger>
                <AccordionContent>No events in the last 30 days.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Row>
      </State>

      <State
        breaks="Physical left and right in the trigger, so the title and icon keep their left-to-right edges when the page is right-to-left. The row is flex justify-between, which follows direction."
        id="rtl"
        note="The same accordion inside dir=rtl. The title sits on the right and the icon on the left, with no extra props."
        title="Right-to-left"
      >
        <div className="max-w-md" dir="rtl">
          <Accordion defaultValue={["shipping"]}>
            <Faq />
          </Accordion>
        </div>
      </State>

      <State
        breaks="Arrow keys that do not move between triggers, or Home and End that do nothing. Focus has to travel without opening anything."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "moves focus onto the first trigger." },
            { keys: "Enter / Space", does: "opens or closes the focused section." },
            { keys: "ArrowDown / ArrowUp", does: "moves focus to the next or previous trigger." },
            { keys: "Home / End", does: "jumps to the first or last trigger." },
            {
              keys: "past the last",
              does: "ArrowDown wraps to the first trigger (loopFocus is on by default).",
            },
          ]}
        >
          <div className="max-w-md">
            <Accordion>
              <Faq disabledValue="billing" />
            </Accordion>
          </div>
        </KeyboardPath>
      </State>

      <Aside title="Accordion versus Collapsible">
        <p>
          <code>Accordion</code> is for a group of related sections that share one open state and
          one keyboard model. A single standalone show/hide region is a <code>Collapsible</code>,
          which has no arrow-key navigation and unmounts closed content.
        </p>
      </Aside>
    </DemoPage>
  );
}
