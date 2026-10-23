"use client";

import {
  Button,
  CopyableField,
  CopyButton,
  CopyCodeButton,
  CopyIdButton,
  CopyLinkButton,
  CopyMenuItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  useCopyToClipboard,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { DEMO_LONG_URL } from "@/lib/demo-fixtures";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Stack, State } from "../demo-kit";

const VARIANTS = [
  "default",
  "ink",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
  "tertiary",
  "warning",
] as const;
const INSTALL = "npm install @nebutra/ui";
const TOKEN = "--color-brand-primary";

/**
 * Makes the clipboard refuse for the length of one click, so the failed state
 * can be seen. The stub is an own property on `navigator` that shadows the real
 * getter and is deleted again as soon as the click has been dispatched.
 */
function RefusedClipboard({ children }: { children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stubs the clipboard around the child button's click; it is not a control itself
    <span
      onClickCapture={() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error("Refused by the preview")) },
        });
      }}
      onClick={() => {
        Reflect.deleteProperty(navigator, "clipboard");
      }}
      role="presentation"
    >
      {children}
    </span>
  );
}

/** A hand-built control over the hook, to show the status it exposes. */
function HookStatus() {
  const { copied, failed, status, copy } = useCopyToClipboard({ showToast: false, timeout: 1500 });
  return (
    <Row>
      <Button onClick={() => copy(INSTALL)} variant="outline">
        Copy with the hook
      </Button>
      <span aria-live="polite" className="text-muted-foreground text-sm">
        status: <code>{status}</code> · copied: {String(copied)} · failed: {String(failed)}
      </span>
    </Row>
  );
}

export default function CopyButtonDemo() {
  const [last, setLast] = React.useState<string | null>(null);

  return (
    <DemoPage>
      <State
        breaks="A labelled button squeezed into the 40px icon square, so its label is truncated to a couple of letters. A label must switch the default size to default."
        code={`<CopyButton value="npm install @nebutra/ui" label="Copy" variant="outline" />`}
        id="labelled"
        note="Click it. The icon becomes a check tinted success-strong and the label reads Copied for two seconds."
        title="Labelled"
      >
        <Row>
          <CopyButton label="Copy" showToast={false} value={INSTALL} variant="outline" />
          <CopyButton label="Copy" showToast={false} value={INSTALL} />
        </Row>
      </State>

      <State
        breaks="An icon-only button with no accessible name, or with two (the tooltip text and a visible label both read out)."
        code={`<CopyButton value={id} tooltipText="Copy deployment ID" />`}
        id="icon-only"
        note="Without a label the button is a ghost icon, wrapped in a tooltip. tooltipText is both the tooltip and the accessible name; hover or focus it."
        title="Icon only"
      >
        <Row>
          <CopyButton showToast={false} tooltipText="Copy install command" value={INSTALL} />
          <CopyButton
            showToast={false}
            tooltipText="Copy install command"
            value={INSTALL}
            variant="outline"
          />
        </Row>
      </State>

      <State
        breaks="A variant whose copied tint disappears. The check carries its own colour class, so it must stay visible on every variant, including solid ones."
        id="variants"
        note="Every Button variant, labelled. Click each and look for the check."
        title="Variants"
      >
        <Row align="start">
          {VARIANTS.map((variant) => (
            <CopyButton
              key={variant}
              label={variant}
              showToast={false}
              value={variant}
              variant={variant}
            />
          ))}
        </Row>
      </State>

      <State
        breaks="A label that is the payload being swapped for Copied, hiding the thing the reader was looking at. copiedLabel=false keeps it, and the check alone confirms."
        code={`<CopyButton
  value="--color-brand-primary"
  label="--color-brand-primary"
  copiedLabel={false}
  iconPosition="trailing"
  variant="outline"
/>`}
        id="payload-label"
        note="Left: the default swaps the label. Right: copiedLabel=false with the icon trailing, for a token row."
        title="Label is the value"
      >
        <Row>
          <CopyButton label={TOKEN} showToast={false} value={TOKEN} variant="outline" />
          <CopyButton
            copiedLabel={false}
            iconPosition="trailing"
            label={TOKEN}
            showToast={false}
            value={TOKEN}
            variant="outline"
          />
        </Row>
      </State>

      <State
        breaks="An icon type that does not match what is being copied, or an icon that is read out by a screen reader."
        id="icon-types"
        note="iconType picks the idle glyph: copy, link, code or hash. The glyph is decoration; the label or tooltipText names the action."
        title="Icon types"
      >
        <Row>
          {(["copy", "link", "code", "hash"] as const).map((iconType) => (
            <CopyButton
              iconType={iconType}
              key={iconType}
              label={iconType}
              showToast={false}
              value={iconType}
              variant="outline"
            />
          ))}
        </Row>
      </State>

      <State
        breaks="A shortcut that drifts from CopyButton: wrong icon, wrong tooltip, or a size that is not the compact 24px square."
        code={`<CopyIdButton id="dpl_8fk2m1" />
<CopyLinkButton url="https://example.com/share/abc" />
<CopyCodeButton code="npm install @nebutra/ui" />`}
        id="shortcuts"
        note="CopyIdButton, CopyLinkButton and CopyCodeButton fix the icon, tooltip and success message, and shrink the button to 24px."
        title="Specialised buttons"
      >
        <Row>
          <CopyIdButton id="dpl_8fk2m1" showToast={false} />
          <CopyLinkButton showToast={false} url="https://example.com/share/abc" />
          <CopyCodeButton code={INSTALL} showToast={false} />
        </Row>
      </State>

      <State
        breaks="A long value that pushes the copy button out of its row. The value truncates and stays readable through its title; the button must stay visible."
        code={`<CopyableField label="Endpoint" value={url} />`}
        id="field"
        note="CopyableField shows the value in a monospace chip with a copy button. truncate (default) ellipsises a long value; set it to false to let the chip grow."
        title="Copyable field"
      >
        <Stack>
          <div className="max-w-sm">
            <CopyableField label="Install" value={INSTALL} />
          </div>
          <div className="max-w-sm">
            <CopyableField label="Endpoint" value={DEMO_LONG_URL} />
          </div>
          <div className="max-w-sm overflow-x-auto">
            <CopyableField label="No truncate" truncate={false} value={DEMO_LONG_URL} />
          </div>
        </Stack>
      </State>

      <State
        breaks="A long label that overflows its button. The label span can shrink and truncate, but only when the button itself has a width to shrink against."
        id="overflow"
        note="The label is truncated with an ellipsis once the button hits its container width."
        title="Overflow — long label"
      >
        <div className="max-w-xs">
          <CopyButton
            className="w-full justify-between"
            iconPosition="trailing"
            label={LONG_LABEL}
            showToast={false}
            value={LONG_LABEL}
            variant="outline"
          />
        </div>
      </State>

      <State
        breaks="A menu that closes on copy, discarding the confirmation before it can be seen, or a copy entry that breaks arrow-key and typeahead navigation."
        code={`<DropdownMenuContent>
  <CopyMenuItem value="--primary">Copy token name</CopyMenuItem>
  <CopyMenuItem value="bg-primary">Copy Tailwind class</CopyMenuItem>
</DropdownMenuContent>`}
        id="menu-item"
        note="CopyMenuItem is a DropdownMenuItem, so arrow keys and typeahead work. The menu stays open after a copy (closeOnCopy is false) so several values can be tried in turn."
        title="Inside a menu"
      >
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Copy colour</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <CopyMenuItem value="--primary">Copy token name</CopyMenuItem>
              <CopyMenuItem value="bg-primary">Copy Tailwind class</CopyMenuItem>
              <CopyMenuItem value="hsl(var(--primary))">Copy CSS colour</CopyMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </State>

      <State
        breaks="A clipboard write that is refused and the control says nothing. The failed state swaps in a warning icon and announces the error message."
        code={`<CopyButton value={text} errorMessage="Select the text and copy it manually." />`}
        id="failed"
        note="This button runs inside a wrapper that makes the clipboard refuse for the length of the click, so the failure path is real. The warning icon replaces the check for two seconds."
        title="Write refused"
      >
        <Row>
          <RefusedClipboard>
            <CopyButton label="Copy" showToast={false} value={INSTALL} variant="outline" />
          </RefusedClipboard>
          <RefusedClipboard>
            <CopyButton showToast={false} tooltipText="Copy (will fail)" value={INSTALL} />
          </RefusedClipboard>
        </Row>
      </State>

      <State
        breaks="A disabled or loading copy button that still writes to the clipboard, or that is not visibly inactive."
        id="disabled-loading"
        note="Both pass through to Button: disabled dims it and blocks clicks; loading disables it and sets aria-busy."
        title="Disabled and loading"
      >
        <Row>
          <CopyButton disabled label="Copy" showToast={false} value={INSTALL} variant="outline" />
          <CopyButton label="Copy" loading showToast={false} value={INSTALL} variant="outline" />
        </Row>
      </State>

      <State
        breaks="onCopied firing before the write succeeds, or firing on failure."
        code={`<CopyButton value={text} onCopied={(value) => setLast(value)} />`}
        id="callback"
        note="onCopied receives the copied value only after the clipboard write resolves. It does not fire in the refused case above."
        title="onCopied callback"
      >
        <Row>
          <CopyButton
            label="Copy"
            onCopied={setLast}
            showToast={false}
            value={INSTALL}
            variant="outline"
          />
          <span aria-live="polite" className="text-muted-foreground text-sm">
            {last ? `onCopied(${JSON.stringify(last)})` : "Not copied yet"}
          </span>
        </Row>
      </State>

      <State
        breaks="A hook whose status is out of step with the buttons built on it. CopyButton and CopyMenuItem are both thin shells over this one implementation."
        code={`const { copied, failed, status, copy } = useCopyToClipboard({ timeout: 1500 });`}
        id="hook"
        note="useCopyToClipboard owns the held state, the reset timer, the toast and the failure path. status moves idle, then copied (or failed), then back to idle."
        title="useCopyToClipboard"
      >
        <HookStatus />
      </State>

      <State
        breaks="A copy control that cannot be reached or activated from the keyboard, or whose result is silent to a screen reader."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "moves focus to the button; disabled and loading buttons are skipped.",
            },
            { keys: "Enter / Space", does: "copies the value." },
            {
              keys: "screen reader",
              does: "hears the success message (or the error message) from a polite live region inside the button, because the check icon is hidden from it.",
            },
          ]}
        >
          <Row>
            <CopyButton label="Copy" showToast={false} value={INSTALL} variant="outline" />
            <CopyButton showToast={false} tooltipText="Copy install command" value={INSTALL} />
            <Button variant="ghost">Next control</Button>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Toast feedback">
        <p>
          <code>showToast</code> is on by default and calls <code>toast.success</code> from sonner,
          so a <code>Toaster</code> has to be mounted once near the root. The examples above turn it
          off; the playground mounts one so its toast knob works. <code>CopyMenuItem</code> defaults
          to no toast, because the item shows its own check.
        </p>
      </Aside>
    </DemoPage>
  );
}
