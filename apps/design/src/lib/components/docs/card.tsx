"use client";

import { ButtonLink, Card } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import { axis, axisDefault, type DemoProps } from "../derived";

export function Playground({ derived }: DemoProps) {
  const defaults = {
    variant: axisDefault(derived, "card", "variant") ?? "default",
    padding: axisDefault(derived, "card", "padding") ?? "none",
  };
  const knobs: Knob[] = [
    {
      name: "variant",
      type: "select",
      options: axis(derived, "card", "variant"),
      defaultValue: defaults.variant,
    },
    {
      name: "padding",
      type: "select",
      options: axis(derived, "card", "padding"),
      defaultValue: defaults.padding,
    },
    { name: "interactive", type: "boolean", defaultValue: false },
    { name: "title", type: "text", defaultValue: "Deployments" },
    { name: "description", type: "text", defaultValue: "Build previews from every push." },
    { name: "footer", type: "boolean", defaultValue: true },
  ];
  return (
    <ComponentPlayground
      caption="Card's sections read its padding context, so none delegates the inset to the parts. interactive adds hover styling only; the footer link provides navigation and keyboard access."
      code={(v) =>
        snippet({
          imports: [
            {
              names: ["Card", ...(v.footer ? ["ButtonLink"] : [])],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: jsx({
            name: "Card",
            defaults,
            props: {
              className: "w-72 max-w-full",
              variant: String(v.variant),
              padding: String(v.padding),
              interactive: v.interactive,
            },
            children: [
              jsx({
                name: "Card.Header",
                props: {},
                children: [
                  jsx({
                    name: "Card.Title",
                    props: {},
                    children: raw(JSON.stringify(String(v.title))),
                  }),
                ],
              }),
              ...(v.description
                ? [
                    jsx({
                      name: "Card.Body",
                      props: {},
                      children: [
                        jsx({
                          name: "Card.Description",
                          props: {},
                          children: raw(JSON.stringify(String(v.description))),
                        }),
                      ],
                    }),
                  ]
                : []),
              ...(v.footer
                ? [
                    jsx({
                      name: "Card.Footer",
                      props: {},
                      children: [
                        jsx({
                          name: "ButtonLink",
                          props: { href: "#examples", size: "sm", variant: "outline" },
                          children: "View examples",
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <Card
          className="w-72 max-w-full"
          interactive={Boolean(v.interactive)}
          padding={v.padding as never}
          variant={v.variant as never}
        >
          <Card.Header>
            <Card.Title>{String(v.title)}</Card.Title>
          </Card.Header>
          {v.description ? (
            <Card.Body>
              <Card.Description>{String(v.description)}</Card.Description>
            </Card.Body>
          ) : null}
          {v.footer ? (
            <Card.Footer>
              <ButtonLink href="#examples" size="sm" variant="outline">
                View examples
              </ButtonLink>
            </Card.Footer>
          ) : null}
        </Card>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={axis(derived, "card", "padding").map((padding) => ({
        id: padding,
        label: padding,
      }))}
      note="Variants and padding steps are read from cardVariants. This surface has no loading or disabled prop. Header, body and footer share the same padding context."
      render={(variant, padding) => (
        <Card className="w-48" padding={padding as never} variant={variant as never}>
          <Card.Header>
            <Card.Title>Deployments</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>Preview every push.</Card.Description>
          </Card.Body>
          <Card.Footer>
            <ButtonLink href="#playground" size="sm" variant="outline">
              Try this card
            </ButtonLink>
          </Card.Footer>
        </Card>
      )}
      rows={axis(derived, "card", "variant").map((variant) => ({ id: variant, label: variant }))}
      rowsLabel="Variant"
    />
  );
}
