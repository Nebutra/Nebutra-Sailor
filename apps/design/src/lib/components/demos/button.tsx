"use client";

import { ArrowRight, Plus, Trash } from "@nebutra/icons";
import { Button, ButtonLink } from "@nebutra/ui/primitives";
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
import { axis, axisDefault } from "../derived";

export default function ButtonDemo({ derived }: DemoProps) {
  const variants = axis(derived, "button", "variant");
  const sizes = axis(derived, "button", "size");
  const shapes = axis(derived, "button", "shape");

  const [loading, setLoading] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A variant added to buttonVariants that nobody checked against the dark theme, or one that reaches for --blue-9 / --brand-primary. That token is the VI identity lock and is lint-banned on component surfaces; --primary is the action fill."
        id="variants"
        note={`All ${variants.length} variants declared in buttonVariants.`}
        title="Every variant"
      >
        <AxisMatrix
          axisName="variant"
          defaultValue={axisDefault(derived, "button", "variant")}
          render={(variant) => <Button variant={variant as never}>Deploy</Button>}
          values={variants}
        />
      </State>

      <State
        breaks="A size whose height stops matching --control-height-*, which is what makes a button line up with an Input in the same form row."
        id="sizes"
        note="Heights come from the control-height tokens, so a button and an input of the same size agree."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue={axisDefault(derived, "button", "size")}
          render={(size) =>
            size === "icon" ? (
              <Button aria-label="Add project" size={size as never}>
                <Plus />
              </Button>
            ) : (
              <Button size={size as never}>Deploy</Button>
            )
          }
          values={sizes}
        />
      </State>

      <State
        breaks="A square/circle compound variant that stops being square because the width rule and the size rule fell out of sync — or a corner radius hardcoded as rounded-md / rounded-full so a Brand Package cannot retarget the shape."
        id="shapes"
        note="shape crosses with size through compound variants — square and circle take their width from the same height token. Radius is token-backed: square → --btn-default-radius / --radius-md, circle/pill → --radius-pill."
        title="Shapes"
      >
        <AxisMatrix
          axisName="shape"
          defaultValue={axisDefault(derived, "button", "shape")}
          render={(shape) =>
            shape === "default" ? (
              <Button>Deploy</Button>
            ) : (
              <Button aria-label="Add project" shape={shape as never}>
                <Plus />
              </Button>
            )
          }
          values={shapes}
        />
      </State>

      <State
        breaks="An icon trigger forced through size=icon (40px) or shape=circle when the product surface actually wants a 28/32/36 rounded-md square — the recurring toolbar / bell / sidebar pattern."
        id="icon-size"
        note="iconSize is orthogonal to size and only combines with shape=square|circle. Boxes read --control-height-icon-sm|md|lg (28/32/36 by default, density-scaled by Brand Packages)."
        title="Icon-only triggers"
      >
        <Row>
          {(["sm", "md", "lg"] as const).map((iconSize) => (
            <Specimen key={iconSize} label={`square · ${iconSize}`}>
              <Button shape="square" iconSize={iconSize} aria-label="Add" variant="outline">
                <Plus />
              </Button>
            </Specimen>
          ))}
          {(["sm", "md", "lg"] as const).map((iconSize) => (
            <Specimen key={`c-${iconSize}`} label={`circle · ${iconSize}`}>
              <Button shape="circle" iconSize={iconSize} aria-label="Add" variant="outline">
                <Plus />
              </Button>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A loading button that stays clickable, loses aria-busy, or jumps size when the spinner appears. Toggle both and watch the width."
        id="loading-disabled"
        note="loading implies disabled and sets aria-busy. The spinner is sized from the same size token as the label."
        title="Loading and disabled"
      >
        <Controls>
          <ControlButton active={loading} onClick={() => setLoading((v) => !v)}>
            loading
          </ControlButton>
          <ControlButton active={disabled} onClick={() => setDisabled((v) => !v)}>
            disabled
          </ControlButton>
        </Controls>
        <Row>
          {["default", "destructive", "outline", "ghost"].map((variant) => (
            <Button disabled={disabled} key={variant} loading={loading} variant={variant as never}>
              Delete workspace
            </Button>
          ))}
        </Row>
      </State>

      <State
        breaks="A prefix icon that keeps its own size instead of taking the button's, or one that is read out by a screen reader on top of the label."
        id="affixes"
        note="prefix and suffix are wrapped in an aria-hidden span and sized from the size token."
        title="Prefix and suffix"
      >
        <Row>
          <Button prefix={<Plus />}>New project</Button>
          <Button suffix={<ArrowRight />} variant="secondary">
            Continue
          </Button>
          <Button prefix={<Trash />} variant="destructive">
            Delete
          </Button>
          <Button loading prefix={<Plus />}>
            Creating
          </Button>
        </Row>
      </State>

      <State
        breaks="A long label breaking the button box instead of the row, or a button row that stops wrapping at narrow widths."
        id="overflow"
        note="The label does not wrap — the button grows. In a constrained column the row wraps instead."
        title="Overflow — long label"
      >
        <Stack>
          <div className="max-w-sm rounded-lg bg-background p-3">
            <Button>{LONG_LABEL}</Button>
          </div>
          <div className="max-w-sm rounded-lg bg-background p-3">
            <Row>
              <Button variant="outline">Cancel</Button>
              <Button>{LONG_LABEL}</Button>
            </Row>
          </div>
        </Stack>
      </State>

      <State
        breaks="A focus ring added at the component level. The global :focus-visible rule supplies it; a local ring double-draws."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "moves focus through the three buttons, skipping the disabled one.",
            },
            { keys: "Enter / Space", does: "activates the focused button." },
            {
              keys: "Tab (on the link)",
              does: "reaches ButtonLink, which is an anchor — Enter follows it, Space does not.",
            },
          ]}
        >
          <Row>
            <Button variant="outline">First</Button>
            <Button disabled>Skipped (disabled)</Button>
            <Button>Second</Button>
            <ButtonLink href="#variants" variant="link">
              ButtonLink
            </ButtonLink>
          </Row>
        </KeyboardPath>
      </State>

      <State
        breaks="A ButtonLink in a loading state that is still reachable by Tab, or one whose disabled look is not matched by aria-disabled."
        id="button-link"
        note="ButtonLink is the anchor twin: same variants, no disabled attribute. Its loading state sets aria-disabled and tabIndex -1 rather than pretending an anchor can be disabled."
        title="ButtonLink"
      >
        <Row>
          <Specimen label="default">
            <ButtonLink href="#variants">Docs</ButtonLink>
          </Specimen>
          <Specimen label="loading">
            <ButtonLink href="#variants" loading>
              Docs
            </ButtonLink>
          </Specimen>
          <Specimen label="suffix">
            <ButtonLink href="#variants" suffix={<ArrowRight />} variant="secondary">
              Docs
            </ButtonLink>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A shadow value invented locally. Levels resolve to shadow-sm / shadow-md from the ramp; lg intentionally resolves to shadow-md too."
        id="shadow"
        note="shadow takes true | sm | md | lg and maps onto the elevation ramp."
        title="Elevation"
      >
        <Row>
          <Specimen label="none">
            <Button variant="outline">Flat</Button>
          </Specimen>
          {(["sm", "md", "lg"] as const).map((level) => (
            <Specimen key={level} label={`shadow="${level}"`}>
              <Button shadow={level} variant="outline">
                Raised
              </Button>
            </Specimen>
          ))}
        </Row>
      </State>

      <Aside title="Why there is no empty state here">
        <p>
          A button with no children is not a state worth pinning — it is a bug at the call site. The
          nearest real case is an icon-only button: use <code>shape=&quot;square&quot;</code> +{" "}
          <code>iconSize</code> (28/32/36 rounded-md triggers) or{" "}
          <code>shape=&quot;circle&quot;</code> when a perfect disc is intentional, always with an{" "}
          <code>aria-label</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
