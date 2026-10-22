"use client";

import { Information } from "@nebutra/icons";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
  Button,
  ButtonLink,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob, type KnobValues } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import { axis, axisDefault, type DemoProps } from "../derived";
import { present } from "./present";

function LiveAlert({ values }: { values: KnobValues }) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <div className="w-72 max-w-full">
      {dismissed ? (
        <Button onClick={() => setDismissed(false)} size="sm" variant="outline">
          Restore alert
        </Button>
      ) : (
        <Alert
          appearance={values.appearance as never}
          close={Boolean(values.close)}
          closeLabel="Dismiss alert"
          size={values.size as never}
          variant={values.variant as never}
          {...present({
            onClose: values.close ? () => setDismissed(true) : undefined,
          })}
        >
          {values.icon ? (
            <AlertIcon>
              <Information />
            </AlertIcon>
          ) : null}
          <AlertContent>
            <AlertTitle>{String(values.title)}</AlertTitle>
            {values.description ? (
              <AlertDescription>{String(values.description)}</AlertDescription>
            ) : null}
          </AlertContent>
          {values.toolbar ? (
            <AlertToolbar>
              <ButtonLink href="#examples" size="sm" variant="outline">
                View examples
              </ButtonLink>
            </AlertToolbar>
          ) : null}
        </Alert>
      )}
    </div>
  );
}

export function Playground({ derived }: DemoProps) {
  const defaults = {
    variant: axisDefault(derived, "alert", "variant") ?? "secondary",
    appearance: axisDefault(derived, "alert", "appearance") ?? "solid",
    size: axisDefault(derived, "alert", "size") ?? "md",
  };
  const knobs: Knob[] = [
    ...(["variant", "appearance", "size"] as const).map(
      (name): Knob => ({
        name,
        type: "select",
        options: axis(derived, "alert", name),
        defaultValue: defaults[name],
      }),
    ),
    { name: "title", type: "text", defaultValue: "Region migration scheduled" },
    {
      name: "description",
      type: "text",
      defaultValue: "Review the deployment examples before your next build.",
    },
    { name: "icon", type: "boolean", defaultValue: true },
    { name: "toolbar", type: "boolean", defaultValue: false },
    { name: "close", type: "boolean", defaultValue: false },
  ];
  return (
    <ComponentPlayground
      caption="Variant, appearance and size come from alertVariants. Dismissal is owned by the caller: close adds the control, onClose removes the alert, and Restore brings it back."
      code={(v) => {
        const alert = jsx({
          name: "Alert",
          defaults,
          props: {
            variant: String(v.variant),
            appearance: String(v.appearance),
            size: String(v.size),
            close: v.close,
            closeLabel: "Dismiss alert",
            onClose: v.close ? raw("() => setDismissed(true)") : undefined,
          },
          children: [
            ...(v.icon ? ["<AlertIcon><Information /></AlertIcon>"] : []),
            jsx({
              name: "AlertContent",
              props: {},
              children: [
                jsx({
                  name: "AlertTitle",
                  props: {},
                  children: raw(JSON.stringify(String(v.title))),
                }),
                ...(v.description
                  ? [
                      jsx({
                        name: "AlertDescription",
                        props: {},
                        children: raw(JSON.stringify(String(v.description))),
                      }),
                    ]
                  : []),
              ],
            }),
            ...(v.toolbar
              ? [
                  jsx({
                    name: "AlertToolbar",
                    props: {},
                    children: [
                      '<ButtonLink href="#examples" size="sm" variant="outline">View examples</ButtonLink>',
                    ],
                  }),
                ]
              : []),
          ],
        });
        const restore =
          '<Button onClick={() => setDismissed(false)} size="sm" variant="outline">Restore alert</Button>';
        const body = jsx({
          name: "div",
          props: { className: "w-72 max-w-full" },
          children: v.close ? raw(`dismissed ? (${restore}) : (${alert})`) : [alert],
        });
        const code = snippet({
          imports: [
            {
              names: [
                "Alert",
                "AlertContent",
                "AlertTitle",
                ...(v.description ? ["AlertDescription"] : []),
                ...(v.icon ? ["AlertIcon"] : []),
                ...(v.toolbar ? ["AlertToolbar", "ButtonLink"] : []),
                ...(v.close ? ["Button"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
            ...(v.icon ? [{ names: ["Information"], from: "@nebutra/icons" }] : []),
            ...(v.close ? [{ names: ["useState"], from: "react" }] : []),
          ],
          body: v.close
            ? `export function AlertExample() {
  const [dismissed, setDismissed] = useState(false);
  return (
${body
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}
  );
}`
            : body,
        });
        return v.close ? `"use client";\n\n${code}` : code;
      }}
      knobs={knobs}
      render={(values) => <LiveAlert key={JSON.stringify(values)} values={values} />}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={axis(derived, "alert", "appearance").map((appearance) => ({
        id: appearance,
        label: appearance,
      }))}
      note="Every source variant is crossed with every appearance. Sizes, optional description, toolbar and functional dismissal are available in the playground. Alert has no disabled or loading prop."
      render={(variant, appearance) => (
        <div className="w-64">
          <Alert appearance={appearance as never} variant={variant as never}>
            <AlertIcon>
              <Information />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Region migration</AlertTitle>
              <AlertDescription>Review the scheduled changes.</AlertDescription>
            </AlertContent>
          </Alert>
        </div>
      )}
      rows={axis(derived, "alert", "variant").map((variant) => ({ id: variant, label: variant }))}
      rowsLabel="Variant"
    />
  );
}
