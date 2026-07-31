"use client";

import { Field, Input, Select, Textarea } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Stack,
  State,
} from "../demo-kit";

export default function FieldDemo() {
  const [error, setError] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A control with no associated label. Field owns htmlFor; the control owns the matching id. Getting them out of sync is the defect this component exists to prevent."
        id="default"
        note="The wrapper mandated by the form-controls rule: label, optional description, optional error."
        title="Default"
      >
        <div className="max-w-sm">
          <Field htmlFor="field-email" label="Email">
            <Input id="field-email" placeholder="you@example.com" type="email" />
          </Field>
        </div>
      </State>

      <State
        breaks="An error that appears without changing the control's own appearance, so a form with one bad field looks entirely valid at a glance. Toggle it and watch both layers."
        id="error"
        note="Field renders the message; the control still needs its own error prop to look invalid. Both are shown."
        title="Description and error"
      >
        <Controls>
          <ControlButton active={error} onClick={() => setError((v) => !v)}>
            error
          </ControlButton>
        </Controls>
        <Stack className="max-w-sm">
          <Field
            description="Used for deploy notifications only."
            {...(error ? { error: "That address is already on this team." } : {})}
            htmlFor="field-email-2"
            label="Email"
          >
            <Input defaultValue="ada@nebutra.com" error={error} id="field-email-2" type="email" />
          </Field>
        </Stack>
      </State>

      <State
        breaks="A form where each control brings its own label spacing, so the rows do not line up. All three below share one wrapper."
        id="mixed"
        note="The same wrapper around three different control types."
        title="Across control types"
      >
        <Stack className="max-w-sm">
          <Field htmlFor="field-name" label="Project name">
            <Input id="field-name" placeholder="my-project" />
          </Field>
          <Field htmlFor="field-plan" label="Plan">
            <Select
              defaultValue="pro"
              id="field-plan"
              options={[
                { value: "hobby", label: "Hobby" },
                { value: "pro", label: "Pro" },
                { value: "enterprise", label: "Enterprise" },
              ]}
            />
          </Field>
          <Field description="Markdown supported." htmlFor="field-notes" label="Notes">
            <Textarea id="field-notes" rows={3} />
          </Field>
        </Stack>
      </State>

      <State
        breaks="A long label that pushes the control out of the column, or an error message that clips instead of wrapping."
        id="overflow"
        title="Overflow"
      >
        <div className="max-w-[16rem] rounded-lg bg-background p-3">
          <Field
            description={LONG_LABEL}
            error="This region is not available on the current plan, and the fallback region is at capacity."
            htmlFor="field-overflow"
            label={LONG_LABEL}
          >
            <Input error id="field-overflow" />
          </Field>
        </div>
      </State>

      <State
        breaks="A label that does not move focus to its control when clicked — the cheapest accessibility win in a form, and the easiest to lose."
        id="keyboard"
        title="Keyboard and pointer path"
      >
        <KeyboardPath
          steps={[
            { keys: "click the label", does: "focuses the associated control." },
            { keys: "Tab", does: "moves between controls in source order." },
            { keys: "screen reader", does: "reads label, then description, then error." },
          ]}
        >
          <Stack className="max-w-sm">
            <Field description="Lowercase, no spaces." htmlFor="field-kb" label="Subdomain">
              <Input id="field-kb" />
            </Field>
            <Field htmlFor="field-kb-2" label="Contact">
              <Input id="field-kb-2" />
            </Field>
          </Stack>
        </KeyboardPath>
      </State>

      <Aside title="Mandated, and until now undocumented">
        <p>
          CLAUDE.md routes every governed form in <code>apps/**</code> through this component. The
          component census recorded it at five consumers with no Storybook story — the largest
          documentation-versus-reality gap on its list. That is why the error state above is
          interactive rather than described.
        </p>
      </Aside>
    </DemoPage>
  );
}
