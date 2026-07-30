"use client";

import { CheckCircle, Star } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import { Aside, AxisMatrix, DemoPage, LONG_LABEL, Row, Stack, State } from "../demo-kit";
import type { DemoProps } from "../derived";
import { axis, axisDefault } from "../derived";

export default function BadgeDemo({ derived }: DemoProps) {
  const variants = axis(derived, "badge", "variant");
  const sizes = axis(derived, "badge", "size");

  return (
    <DemoPage>
      <State
        breaks="A variant added to badgeVariants without a contrast check. Every value below is read from the cva map at build time, so a new one cannot be added without appearing here."
        id="variants"
        note={`All ${variants.length} variants declared in badgeVariants, in source order.`}
        title="Every variant"
      >
        <AxisMatrix
          axisName="variant"
          defaultValue={axisDefault(derived, "badge", "variant")}
          render={(variant) => (
            <Badge variant={variant as never}>{variant.replace("-subtle", " subtle")}</Badge>
          )}
          values={variants}
        />
      </State>

      <State
        breaks="A size whose icon slot, letter-spacing or height drifts from the others."
        id="sizes"
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue={axisDefault(derived, "badge", "size")}
          render={(size) => (
            <Row align="center">
              <Badge size={size as never}>Ready</Badge>
              <Badge icon={<CheckCircle />} size={size as never} variant="green-subtle">
                Passing
              </Badge>
            </Row>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="An icon that does not scale with the size token, or an icon that is announced to screen readers when it is decorative."
        id="with-icon"
        note="The icon slot is aria-hidden; the label carries the meaning."
        title="With icon"
      >
        <Row>
          <Badge icon={<CheckCircle />} variant="green-subtle">
            Deployed
          </Badge>
          <Badge icon={<Star />} variant="amber-subtle">
            Starred
          </Badge>
          <Badge icon={<Star />} variant="trial">
            Trial
          </Badge>
        </Row>
      </State>

      <State
        breaks="Long content forcing a wrap inside a pill, or breaking the row it sits in. The badge is whitespace-nowrap by design — the enclosing layout has to be the thing that gives."
        id="overflow"
        note="A badge does not truncate. In a narrow container it stays on one line and pushes; that is the contract, and this is what it looks like."
        title="Overflow — long label"
      >
        <Stack>
          <div className="max-w-xs rounded-lg bg-background p-3">
            <Badge variant="blue-subtle">{LONG_LABEL}</Badge>
          </div>
          <div className="flex max-w-xs gap-2 overflow-x-auto rounded-lg bg-background p-3">
            <Badge>Production</Badge>
            <Badge variant="outline">{LONG_LABEL}</Badge>
            <Badge variant="gray-subtle">v2</Badge>
          </div>
        </Stack>
      </State>

      <State
        breaks="A link badge losing the pill styling, or the anchor losing its href because asChild dropped the child's props."
        id="as-child"
        note="asChild renders the badge styling onto a supplied element. This one is a real anchor — tab to it."
        title="As a link"
      >
        <Row>
          <Badge asChild variant="pill">
            <a href="#variants">Jump to variants</a>
          </Badge>
        </Row>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-disabled"
        note="Badge has no disabled state and no loading state. It is a label, not a control. If a badge needs to look inactive, that is a variant choice (gray-subtle, coming-soon), not a prop."
        title="States Badge deliberately does not have"
      >
        <Row>
          <Badge variant="gray-subtle">Inactive</Badge>
          <Badge variant="coming-soon">Coming soon</Badge>
        </Row>
      </State>

      <Aside title="The dot prop is deprecated">
        <p>
          <code>dot</code> is marked deprecated in the source in favour of <code>StatusDot</code>.
          It still renders, and it is shown here so an existing call site is recognisable, not so
          new ones get written.
        </p>
        <div className="mt-3">
          <Badge dot variant="green-subtle">
            Healthy
          </Badge>
        </div>
      </Aside>
    </DemoPage>
  );
}
