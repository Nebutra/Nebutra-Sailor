"use client";

import { Textarea } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  AxisMatrix,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_PARAGRAPH,
  Row,
  Specimen,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

export default function TextareaDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size ?? [];
  const [error, setError] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A textarea whose padding and radius drift from Input's, which is what makes a mixed form look assembled rather than designed."
        id="default"
        note="Shares Input's field scale, description slot and error contract."
        title="Default"
      >
        <div className="max-w-lg">
          <Textarea
            description="Markdown is supported."
            id="demo-notes"
            label="Release notes"
            placeholder="What changed?"
            rows={4}
          />
        </div>
      </State>

      <State
        breaks="A size that changes the font size without changing the min-height, so the box stops looking proportional."
        id="sizes"
        note="Sizes come from the TextareaSize union in tokens/components/textarea.ts."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          className="items-start"
          defaultValue="md"
          render={(size) => (
            <div className="w-56">
              <Textarea placeholder={size} size={size as never} />
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="An error message that pushes the submit button off-screen, or a disabled textarea that still looks editable."
        id="error"
        title="Error and disabled"
      >
        <Controls>
          <ControlButton active={error} onClick={() => setError((v) => !v)}>
            error
          </ControlButton>
          <ControlButton active={disabled} onClick={() => setDisabled((v) => !v)}>
            disabled
          </ControlButton>
        </Controls>
        <div className="max-w-lg">
          <Textarea
            description="Visible to everyone on the team."
            disabled={disabled}
            error={error ? "Release notes cannot be empty." : false}
            id="demo-notes-error"
            label="Release notes"
            rows={3}
          />
        </div>
      </State>

      <State
        breaks="Content that grows the box past its container instead of scrolling inside it. The box must scroll; the page must not."
        id="overflow"
        note="More content than rows allows, at a constrained width."
        title="Overflow"
      >
        <div className="max-w-xs rounded-lg bg-background p-3">
          <Textarea
            defaultValue={`${LONG_PARAGRAPH}\n\n${LONG_PARAGRAPH}`}
            id="demo-notes-overflow"
            label="Build log excerpt"
            rows={4}
          />
        </div>
      </State>

      <State
        breaks="An empty textarea that reads as filled, or a placeholder that sits at a different baseline from a real value."
        id="empty"
        title="Empty versus filled"
      >
        <Row align="start">
          <Specimen label="empty">
            <div className="w-56">
              <Textarea placeholder="Add a note…" rows={3} />
            </div>
          </Specimen>
          <Specimen label="filled">
            <div className="w-56">
              <Textarea defaultValue="Rolled back to the previous build." rows={3} />
            </div>
          </Specimen>
          <Specimen label="readOnly">
            <div className="w-56">
              <Textarea defaultValue="Rolled back to the previous build." readOnly rows={3} />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A textarea that traps Tab because someone bound it to indentation. Tab must leave the field."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the textarea." },
            { keys: "Enter", does: "inserts a newline — it does not submit the form." },
            { keys: "Tab", does: "leaves the field and reaches the next control." },
          ]}
        >
          <div className="flex max-w-lg flex-col gap-3">
            <Textarea id="demo-notes-kb" label="Comment" rows={3} />
            <div className="text-muted-foreground text-xs">Next focusable element</div>
          </div>
        </KeyboardPath>
      </State>
    </DemoPage>
  );
}
