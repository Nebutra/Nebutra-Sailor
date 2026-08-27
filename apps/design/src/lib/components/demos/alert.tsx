"use client";

import { CheckCircle, Information, Warning } from "@nebutra/icons";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
  Button,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  DemoPage,
  KeyboardPath,
  LONG_PARAGRAPH,
  MissingAxis,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";
import { axis, axisDefault } from "../derived";

const ICON_FOR: Record<string, React.ReactNode> = {
  destructive: <Warning />,
  success: <CheckCircle />,
  warning: <Warning />,
};

function iconFor(variant: string) {
  return ICON_FOR[variant] ?? <Information />;
}

export default function AlertDemo({ derived }: DemoProps) {
  const variants = axis(derived, "alert", "variant");
  const appearances = axis(derived, "alert", "appearance");
  const sizes = axis(derived, "alert", "size");

  const [dismissed, setDismissed] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A variant whose foreground fails contrast on its own tint. This is the exact class of bug the --*-strong tokens exist to fix; a new variant that reaches for the plain fill as ink will look wrong here first."
        id="variants"
        note={`All ${variants.length} variants, at the default appearance.`}
        title="Every variant"
      >
        {variants.length === 0 ? (
          <MissingAxis axisName="variant" />
        ) : (
          <Stack>
            {variants.map((variant) => (
              <Alert key={variant} variant={variant as never}>
                <AlertIcon>{iconFor(variant)}</AlertIcon>
                <AlertTitle>
                  {variant}
                  {variant === axisDefault(derived, "alert", "variant") ? " (default)" : ""}
                </AlertTitle>
              </Alert>
            ))}
          </Stack>
        )}
      </State>

      <State
        breaks="An appearance that only got checked against one variant. This is the full cross-product, so a light/stroke combination that loses its edge shows up immediately."
        id="appearances"
        note={`${appearances.length} appearances crossed with four representative variants — the whole ${variants.length}×${appearances.length} matrix is the real surface.`}
        title="Appearance × variant"
      >
        {appearances.length === 0 ? (
          <MissingAxis axisName="appearance" />
        ) : (
          <div className="flex flex-col gap-6">
            {appearances.map((appearance) => (
              <div className="flex flex-col gap-2" key={appearance}>
                <code className="font-mono text-[11px] text-muted-foreground">
                  appearance="{appearance}"
                </code>
                <div className="grid gap-2">
                  {["secondary", "destructive", "success", "warning"].map((variant) => (
                    <Alert
                      appearance={appearance as never}
                      key={variant}
                      variant={variant as never}
                    >
                      <AlertIcon>{iconFor(variant)}</AlertIcon>
                      <AlertTitle>Build {variant === "success" ? "passed" : variant}</AlertTitle>
                    </Alert>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </State>

      <State
        breaks="A size that shrinks the padding but not the icon, so the icon stops being optically centred."
        id="sizes"
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          className="flex-col"
          defaultValue={axisDefault(derived, "alert", "size")}
          render={(size) => (
            <div className="w-full max-w-xl">
              <Alert size={size as never} variant="primary">
                <AlertIcon>
                  <Information />
                </AlertIcon>
                <AlertTitle>Region migration scheduled for Sunday.</AlertTitle>
              </Alert>
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="A description that collides with the close button, or a toolbar action that wraps under the icon instead of staying on the action rail."
        id="composition"
        note="AlertContent stacks a title and description; AlertToolbar holds the actions."
        title="Full composition"
      >
        <div className="max-w-xl">
          <Alert appearance="outline" variant="destructive">
            <AlertIcon>
              <Warning />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Deployment failed</AlertTitle>
              <AlertDescription>{LONG_PARAGRAPH}</AlertDescription>
            </AlertContent>
            <AlertToolbar>
              <Button size="sm" variant="outline">
                View logs
              </Button>
              <Button size="sm" variant="destructive">
                Redeploy
              </Button>
            </AlertToolbar>
          </Alert>
        </div>
      </State>

      <State
        breaks="A dismissible alert whose close button has no accessible name, or one that leaves an empty box behind after dismissal."
        id="dismissible"
        note="close renders the dismiss control; onClose is the caller's job. Dismiss it and the region collapses rather than leaving a gap."
        title="Dismissible"
      >
        <div className="max-w-xl">
          {dismissed ? (
            <Button onClick={() => setDismissed(false)} size="sm" variant="outline">
              Bring it back
            </Button>
          ) : (
            <Alert appearance="light" close onClose={() => setDismissed(true)} variant="success">
              <AlertIcon>
                <CheckCircle />
              </AlertIcon>
              <AlertTitle>Domain verified.</AlertTitle>
            </Alert>
          )}
        </div>
      </State>

      <State
        breaks="Long text that clips instead of wrapping, or a title and description that stop being distinguishable at narrow widths."
        id="overflow"
        title="Overflow — narrow container"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-3">
          <Alert appearance="outline" variant="warning">
            <AlertIcon>
              <Warning />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>
                Provisioning a dedicated single-tenant analytics cluster in Frankfurt
              </AlertTitle>
              <AlertDescription>{LONG_PARAGRAPH}</AlertDescription>
            </AlertContent>
          </Alert>
        </div>
      </State>

      <State
        breaks="A close button reachable only by pointer, or toolbar buttons that come before the message in tab order."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "reaches the toolbar actions in reading order." },
            { keys: "Tab", does: "then reaches the close button — it is last, not first." },
            { keys: "Enter / Space", does: "activates the focused control." },
          ]}
        >
          <div className="max-w-xl">
            <Alert appearance="outline" close onClose={() => undefined} variant="info">
              <AlertIcon>
                <Information />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>A new runtime is available.</AlertTitle>
              </AlertContent>
              <AlertToolbar>
                <Button size="sm" variant="outline">
                  Upgrade
                </Button>
              </AlertToolbar>
            </Alert>
          </div>
        </KeyboardPath>
      </State>

      <Aside title="Alert had no Storybook story before this page">
        <p>
          The component census recorded Alert at seven consumers with no story anywhere, and{" "}
          <code>apps/forge</code> hand-rolled a toned error box (<code>ShellError</code>) rather
          than use it. The variant × appearance matrix above is the discoverability that was
          missing.
        </p>
      </Aside>
    </DemoPage>
  );
}
