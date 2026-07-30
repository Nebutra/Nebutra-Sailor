"use client";

import { Avatar } from "@nebutra/ui/primitives";
import { Aside, DemoPage, Row, Specimen, State } from "../demo-kit";

/**
 * An inline data URI rather than a remote avatar, so this page renders the same
 * offline, in CI and in a sandbox. A remote image would make the fallback states
 * below depend on network conditions, which is exactly what they must not do.
 */
const REAL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" fill="#1f2937"/>
       <circle cx="32" cy="24" r="11" fill="#9ca3af"/>
       <path d="M8 64c0-13.3 10.7-24 24-24s24 10.7 24 24z" fill="#9ca3af"/>
     </svg>`,
  );

const BROKEN = "/definitely-not-an-image.png";

export default function AvatarDemo() {
  return (
    <DemoPage>
      <State
        breaks="A size prop treated as a token when it is a pixel number. Avatar takes either — xs…xl or a number."
        id="sizes"
        note="Preset sizes and an explicit pixel size, same source."
        title="Sizes"
      >
        <Row align="end" className="gap-6">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <Specimen key={size} label={size}>
              <Avatar size={size} src={REAL} title="Guillermo Rauch" />
            </Specimen>
          ))}
          <Specimen label="size={48}">
            <Avatar size={48} src={REAL} title="Guillermo Rauch" />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="The fallback chain, which is where this component actually fails. A broken src that renders a torn-image icon, or a letter fallback that never appears because the image is still 'loading', are both live bugs. The third specimen below points at a domain that cannot resolve."
        id="fallbacks"
        note="A real image, a letter fallback with no src, a username-derived fallback, a placeholder, and a src that will never load."
        title="Fallback chain"
      >
        <Row align="end" className="gap-6">
          <Specimen label="src loads">
            <Avatar size="lg" src={REAL} title="Guillermo Rauch" />
          </Specimen>
          <Specimen label="letter">
            <Avatar letter="A" size="lg" title="Ada Lovelace" />
          </Specimen>
          <Specimen label="username">
            <Avatar size="lg" username="ada-lovelace" />
          </Specimen>
          <Specimen label="placeholder">
            <Avatar placeholder size="lg" />
          </Specimen>
          <Specimen label="src fails to load">
            <Avatar letter="G" size="lg" src={BROKEN} title="Guillermo Rauch" />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A fallback that flashes before the image resolves on a fast connection, or one that appears too late on a slow one. fallbackDelayMs is the control; both extremes are wrong."
        id="delay"
        note="A short and a long fallback delay against a failing source. Reload the page to see the difference."
        title="Fallback delay"
      >
        <Row className="gap-6">
          <Specimen label="fallbackDelayMs={0}">
            <Avatar fallbackDelayMs={0} letter="G" size="lg" src={BROKEN} />
          </Specimen>
          <Specimen label="fallbackDelayMs={1200}">
            <Avatar fallbackDelayMs={1200} letter="G" size="lg" src={BROKEN} />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="An avatar with no accessible name at all. title becomes the name; without it and without alt, a screen reader reads nothing."
        id="labelling"
        note="With a title, with alt only, and with neither."
        title="Accessible name"
      >
        <Row className="gap-6">
          <Specimen label="title">
            <Avatar size="md" src={REAL} title="Guillermo Rauch" />
          </Specimen>
          <Specimen label="alt">
            <Avatar alt="Guillermo Rauch" size="md" src={REAL} />
          </Specimen>
          <Specimen label="neither — unnamed">
            <Avatar size="md" src={REAL} />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="An avatar stack that overlaps in the wrong z-order, or one that keeps growing past its container instead of collapsing to a +N. This is the hand-rolled version; AvatarSmartGroup owns the collapse and is not covered yet."
        id="overflow"
        note="Eight avatars in a container that fits four."
        title="Overflow — a stack"
      >
        <div className="max-w-[10rem] rounded-lg bg-background p-3">
          <div className="flex">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="-ml-2 first:ml-0" key={i}>
                <Avatar letter={String.fromCharCode(65 + i)} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </State>

      <Aside title="There is no loading, error or keyboard state">
        <p>
          Avatar's "error" state is the fallback chain above — it does not surface a failure, it
          degrades. It is not focusable; an avatar that opens a menu is a <code>DropdownMenu</code>{" "}
          trigger wrapping one, and the keyboard contract belongs to the menu. The overflow collapse
          belongs to <code>AvatarSmartGroup</code>, which the census ranks at five consumers with no
          coverage.
        </p>
      </Aside>
    </DemoPage>
  );
}
