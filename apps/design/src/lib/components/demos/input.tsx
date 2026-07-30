"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

export default function InputDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size ?? [];

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const [search, setSearch] = React.useState("frankfurt");

  return (
    <DemoPage>
      <State
        breaks="A field that renders without a label. Input's types make label and id co-required: supplying one without the other is a type error, not a runtime surprise."
        id="default"
        note="The labelled form. label and id are co-required at the type level."
        title="Default"
      >
        <div className="max-w-sm">
          <Input id="demo-email" label="Email" placeholder="you@example.com" type="email" />
        </div>
      </State>

      <State
        breaks="A size whose height stops matching the control-height token, which is what keeps an input aligned with a same-size Button."
        id="sizes"
        note="Sizes come from the InputSize union in tokens/components/input.ts, not from a cva map."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          className="items-end"
          defaultValue="md"
          render={(size) => (
            <div className="w-48">
              <Input placeholder={size} size={size as never} />
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="An inline error that changes the field height and shoves the rest of the form down. Toggle error and watch whether anything below moves."
        id="error"
        note="error takes a string or a boolean. A boolean marks the control invalid; a string also renders the message and wires aria-describedby."
        title="Error and description"
      >
        <Controls>
          <ControlButton active={error} onClick={() => setError((v) => !v)}>
            error
          </ControlButton>
          <ControlButton active={disabled} onClick={() => setDisabled((v) => !v)}>
            disabled
          </ControlButton>
        </Controls>
        <Row align="start">
          <div className="w-64">
            <Input
              description="We only use this for deploy notifications."
              disabled={disabled}
              error={error ? "That address is already on this team." : false}
              id="demo-error"
              label="Email"
              defaultValue="ada@nebutra.com"
            />
          </div>
          <div className="w-64">
            <Input
              description="Between 8 and 72 characters."
              disabled={disabled}
              error={error}
              hideLabel="Hide password"
              id="demo-password"
              label="Password"
              revealLabel="Show password"
              revealable
              type="password"
              defaultValue="correct-horse"
            />
          </div>
        </Row>
      </State>

      <State
        breaks="A spinner that disables the field. loading is for async validation — the user must be able to keep typing while it resolves."
        id="loading"
        note="loading shows a spinner on the right and leaves the control interactive."
        title="Loading"
      >
        <Controls>
          <ControlButton active={loading} onClick={() => setLoading((v) => !v)}>
            loading
          </ControlButton>
        </Controls>
        <div className="max-w-sm">
          <Input
            description={loading ? "Checking availability…" : "Available."}
            id="demo-loading"
            label="Subdomain"
            loading={loading}
            defaultValue="acme"
          />
        </div>
      </State>

      <State
        breaks="A search field where the clear button appears over the suffix, or where Escape does not clear. Type into it, then press Escape."
        id="affixes"
        note="prefix and suffix are decorative. clearable and shortcut render real controls on the right and take priority over suffix."
        title="Affixes, clear and shortcut"
      >
        <Stack>
          <div className="max-w-sm">
            <Input
              clearable
              onValueChange={setSearch}
              placeholder="Search regions"
              prefix={<MagnifyingGlass />}
              shortcut="⌘K"
              type="search"
              value={search}
            />
          </div>
          <Row align="start">
            <div className="w-56">
              <Input placeholder="0.00" prefix={<span className="text-xs">$</span>} />
            </div>
            <div className="w-56">
              <Input
                placeholder="my-project"
                suffix={<span className="text-xs">.nebutra.app</span>}
              />
            </div>
          </Row>
        </Stack>
      </State>

      <State
        breaks="A value longer than the field: the text must scroll inside the control, and the label and helper text must wrap rather than clip. Watch the right edge where the affix sits."
        id="overflow"
        note="Long value, long label and long helper text at a constrained width."
        title="Overflow"
      >
        <div className="max-w-[16rem] rounded-lg bg-background p-3">
          <Input
            clearable
            description={`${LONG_LABEL}. This helper text is deliberately longer than the field.`}
            id="demo-overflow"
            label={LONG_LABEL}
            defaultValue="https://frankfurt-eu-central-1.analytics.internal.nebutra.app/v2/ingest"
          />
        </div>
      </State>

      <State
        breaks="An empty field that reads as filled. Placeholder text must be visibly quieter than a real value."
        id="empty"
        note="Placeholder versus value, side by side, at the same size."
        title="Empty versus filled"
      >
        <Row align="start">
          <Specimen label="empty">
            <div className="w-56">
              <Input placeholder="you@example.com" />
            </div>
          </Specimen>
          <Specimen label="filled">
            <div className="w-56">
              <Input defaultValue="ada@nebutra.com" />
            </div>
          </Specimen>
          <Specimen label="readOnly">
            <div className="w-56">
              <Input defaultValue="ada@nebutra.com" readOnly />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A clear button that cannot be reached by keyboard, or an Escape handler that swallows the key when the field is already empty."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "focuses the field. The ring comes from the global :focus-visible rule.",
            },
            {
              keys: "Escape",
              does: "clears a search field with a value (clearOnEscape defaults to true for type=search).",
            },
            { keys: "Tab again", does: "reaches the clear button while the field has a value." },
            {
              keys: "Enter / Space",
              does: "on the clear button, empties the field and fires onClear.",
            },
          ]}
        >
          <div className="max-w-sm">
            <Input
              clearable
              id="demo-keyboard"
              label="Search regions"
              onValueChange={setSearch}
              prefix={<MagnifyingGlass />}
              type="search"
              value={search}
            />
          </div>
        </KeyboardPath>
      </State>

      <Aside title="Raw input is lint-banned in apps">
        <p>
          <code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code> and <code>&lt;select&gt;</code>{" "}
          are banned in <code>apps/**</code> by <code>scripts/lint-no-raw-inputs.mjs</code>. The
          documented opt-out is <code>data-allow-native</code>, and it exists for hidden fields and
          file inputs driven by a custom button — not for convenience.
        </p>
      </Aside>
    </DemoPage>
  );
}
