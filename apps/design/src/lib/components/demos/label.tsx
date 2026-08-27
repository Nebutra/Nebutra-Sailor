"use client";

import { Checkbox, Input, Label } from "@nebutra/ui/primitives";
import { Aside, DemoPage, KeyboardPath, Row, Specimen, Stack, State } from "../demo-kit";

export default function LabelDemo() {
  return (
    <DemoPage>
      <State
        breaks="A label with no htmlFor. Without it the label is decoration, and clicking it does nothing."
        id="default"
        note="htmlFor binds the label to the control's id."
        title="Default"
      >
        <Stack className="max-w-sm">
          <Label htmlFor="label-email">Email</Label>
          <Input id="label-email" placeholder="you@example.com" type="email" />
        </Stack>
      </State>

      <State
        breaks="A disabled control whose label stays at full contrast, so the row does not read as disabled. This is what the peer- classes on Label are for, and they only work when the control is a previous sibling marked peer."
        id="peer-disabled"
        note="The right-hand pair is disabled. Compare the label weight, not just the box."
        title="Peer-disabled"
      >
        <Row className="gap-10">
          <Specimen label="enabled">
            <div className="flex items-center gap-2">
              <Checkbox id="label-terms">{null}</Checkbox>
              <Label htmlFor="label-terms">Accept terms</Label>
            </div>
          </Specimen>
          <Specimen label="disabled">
            <div className="flex items-center gap-2">
              <Checkbox disabled id="label-terms-2">
                {null}
              </Checkbox>
              <Label htmlFor="label-terms-2">Accept terms</Label>
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A required marker rendered as colour alone, or one appended in a way that a screen reader reads as part of the field name in a confusing order."
        id="required"
        note="The asterisk is part of the label text. There is no required prop."
        title="Required marker"
      >
        <Stack className="max-w-sm">
          <Label htmlFor="label-required">Email *</Label>
          <Input id="label-required" required type="email" />
        </Stack>
      </State>

      <State
        breaks="A long label that clips instead of wrapping, or one whose second line loses its leading."
        id="overflow"
        title="Overflow — long label"
      >
        <div className="max-w-[15rem] rounded-lg bg-background p-3">
          <Stack>
            <Label htmlFor="label-overflow">
              Provisioning region for the dedicated single-tenant analytics cluster
            </Label>
            <Input id="label-overflow" />
          </Stack>
        </div>
      </State>

      <State
        breaks="A label that is not a real label element, so clicking it does not focus the control."
        id="keyboard"
        title="Pointer path"
      >
        <KeyboardPath
          steps={[
            { keys: "click the label", does: "focuses the bound control." },
            { keys: "click a checkbox label", does: "toggles the checkbox." },
          ]}
        >
          <Stack className="max-w-sm">
            <Label htmlFor="label-kb">Project name</Label>
            <Input id="label-kb" />
          </Stack>
        </KeyboardPath>
      </State>

      <Aside title="Prefer Field over a bare Label">
        <p>
          Label on its own leaves the caller to supply the spacing, the description slot and the
          error slot — and to keep <code>htmlFor</code> and <code>id</code> in agreement.{" "}
          <code>Field</code> does all four. Label exists for the cases Field does not cover, such as
          the checkbox row above.
        </p>
      </Aside>
    </DemoPage>
  );
}
