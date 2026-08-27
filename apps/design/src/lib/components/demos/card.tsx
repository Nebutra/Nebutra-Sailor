"use client";

import { Cloud } from "@nebutra/icons";
import { Card } from "@nebutra/ui/patterns";
import { Badge, Button } from "@nebutra/ui/primitives";
import {
  Aside,
  AxisMatrix,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  LONG_PARAGRAPH,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

export default function CardDemo({ derived }: DemoProps) {
  const variants = derived.axes.variant ?? [];
  const paddings = derived.axes.padding ?? [];

  return (
    <DemoPage>
      <State
        breaks="A variant added to variantStyles whose border and shadow disagree in one theme. Every value below is read from that map at build time."
        id="variants"
        note={`All ${variants.length} variants. Shadows come from the elevation ramp; none of these use a bespoke shadow value.`}
        title="Every variant"
      >
        <AxisMatrix
          axisName="variant"
          className="items-stretch"
          defaultValue="default"
          render={(variant) => (
            <div className="w-60">
              <Card padding="md" variant={variant as never}>
                <Card.Header>
                  <Card.Title>{variant}</Card.Title>
                </Card.Header>
                <Card.Body>
                  <Card.Description>
                    A short line of body copy so the surface has something on it.
                  </Card.Description>
                </Card.Body>
              </Card>
            </div>
          )}
          values={variants}
        />
      </State>

      <State
        breaks="Padding applied per card at the call site, which is how a grid of cards ends up with three different insets. padding is a prop, and none is one of the values."
        id="padding"
        note={`All ${paddings.length} padding steps from paddingMap.`}
        title="Padding"
      >
        <AxisMatrix
          axisName="padding"
          className="items-stretch"
          defaultValue="md"
          render={(padding) => (
            <div className="w-48">
              <Card padding={padding as never} variant="bordered">
                <Card.Body>
                  <Card.Description>padding="{padding}"</Card.Description>
                </Card.Body>
              </Card>
            </div>
          )}
          values={paddings}
        />
      </State>

      <State
        breaks="A card whose footer floats away from the bottom when the body is short, so a grid of cards has ragged footers. The two below have very different body lengths."
        id="composition"
        note="Icon, header, body and footer. Both cards are in the same grid row."
        title="Full composition"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="md" variant="elevated">
            <Card.Header>
              <Card.Icon>
                <Cloud />
              </Card.Icon>
              <Card.Title>Edge network</Card.Title>
              <Card.Description>Short body.</Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button size="sm" variant="outline">
                Configure
              </Button>
            </Card.Footer>
          </Card>
          <Card padding="md" variant="elevated">
            <Card.Header>
              <Card.Icon>
                <Cloud />
              </Card.Icon>
              <Card.Title>Analytics cluster</Card.Title>
            </Card.Header>
            <Card.Body>
              <Card.Description>{LONG_PARAGRAPH}</Card.Description>
            </Card.Body>
            <Card.Footer>
              <Badge variant="green-subtle">Healthy</Badge>
              <Button size="sm" variant="outline">
                Configure
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </State>

      <State
        breaks="An empty card rendering as a blank rectangle with no explanation — the most common way a dashboard grid looks broken. The right-hand card is the shape that works."
        id="empty"
        note="A card with nothing in it, and a card whose body is an explicit empty message."
        title="Empty"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="md" variant="bordered">
            {null}
          </Card>
          <Card padding="md" variant="bordered">
            <Card.Header>
              <Card.Title>Recent deployments</Card.Title>
            </Card.Header>
            <Card.Body>
              <Card.Description>
                Nothing has been deployed from this branch. Push a commit to start.
              </Card.Description>
            </Card.Body>
          </Card>
        </div>
      </State>

      <State
        breaks="A long title that pushes the card wider than its grid column, or body copy that overflows the padding instead of wrapping."
        id="overflow"
        note="A long title and a long body at a narrow column width."
        title="Overflow"
      >
        <div className="max-w-[15rem]">
          <Card padding="sm" variant="bordered">
            <Card.Header>
              <Card.Title>{LONG_LABEL}</Card.Title>
            </Card.Header>
            <Card.Body>
              <Card.Description>{LONG_PARAGRAPH}</Card.Description>
            </Card.Body>
            <Card.Footer>
              <Button size="sm" variant="outline">
                Open the deployment overview
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </State>

      <State
        breaks="A whole card made clickable by putting an onClick on the container. That gives a div a pointer cursor and no keyboard path at all. The pattern that works is a real control inside the card."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "reaches the controls inside the card — the card itself is not a tab stop.",
            },
            { keys: "Enter", does: "follows the link." },
            {
              keys: "note",
              does: "Card has no interactive variant. If the whole surface must be clickable, the anchor goes inside it and is stretched over it, not the other way round.",
            },
          ]}
        >
          <div className="max-w-sm">
            <Card padding="md" variant="elevated">
              <Card.Header>
                <Card.Title>acme-analytics</Card.Title>
                <Card.Description>Deployed 4 minutes ago from main</Card.Description>
              </Card.Header>
              <Card.Footer>
                <Button size="sm" variant="link">
                  View deployment
                </Button>
                <Button size="sm" variant="outline">
                  Redeploy
                </Button>
              </Card.Footer>
            </Card>
          </div>
        </KeyboardPath>
      </State>

      <Aside title="There are two Cards">
        <p>
          This is <code>Card</code> from <code>@nebutra/ui/patterns</code> — the compound one, with
          Header, Body, Footer, Title, Description and Icon. There is a second, unrelated{" "}
          <code>Card</code> exported from <code>@nebutra/ui/layout</code> with a different and much
          smaller API. Importing the wrong one compiles and then renders something that looks almost
          right, which is the worst kind of collision. Check the specifier, not the name.
        </p>
      </Aside>
    </DemoPage>
  );
}
