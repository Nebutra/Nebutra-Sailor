"use client";
// @primitive-exempt: the ellipsis is wrapped in a bare button on purpose: it shows how to give the decorative BreadcrumbEllipsis its own accessible control.

import { Home } from "@nebutra/icons";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, Stack, State } from "../demo-kit";

/** Keeps a demo link from navigating away from the page being read. */
const hold = (event: React.MouseEvent) => event.preventDefault();

const DEEP = [
  "Home",
  "Projects",
  "Acme web",
  "Deployments",
  "Production",
  "Functions",
  "Regions",
  "Frankfurt",
];

export default function BreadcrumbDemo() {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="The current page rendered as a link to itself, so a screen reader announces a link that goes nowhere. The last entry is BreadcrumbPage, which carries aria-current and is not focusable."
        code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Settings</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`}
        id="default"
        note="Links are real anchors (held in place on this page). The last item is the current page."
        title="Default"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" onClick={hold}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/projects" onClick={hold}>
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </State>

      <State
        breaks="A separator that needs to differ on one divider but is only set once on Breadcrumb. Children of a BreadcrumbSeparator win over the separator prop."
        code={`<Breadcrumb separator="/">…</Breadcrumb>
<BreadcrumbSeparator>/</BreadcrumbSeparator>`}
        id="separator"
        note="Any node works as a separator, set once with the separator prop on Breadcrumb or per divider as children of BreadcrumbSeparator. It is aria-hidden, so it adds nothing to what a screen reader reads."
        title="Custom separators"
      >
        <Stack>
          {(["/", "·", "→"] as const).map((mark) => (
            <Breadcrumb aria-label={`Trail with ${mark}`} key={mark}>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" onClick={hold}>
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>{mark}</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects" onClick={hold}>
                    Projects
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>{mark}</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          ))}
        </Stack>
      </State>

      <State
        breaks="An ellipsis that looks clickable and is not. BreadcrumbEllipsis is aria-hidden decoration; to expose the hidden levels, wrap it in a control with its own name, as here."
        code={`<BreadcrumbItem>
  <button aria-label="Show hidden levels" onClick={expand} type="button">
    <BreadcrumbEllipsis />
  </button>
</BreadcrumbItem>`}
        id="collapsed"
        note="The ellipsis sits inside a real button that reveals the collapsed levels."
        title="Collapsed levels"
      >
        <Breadcrumb aria-label="Collapsible trail">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" onClick={hold}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {expanded ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects" onClick={hold}>
                    Projects
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects/acme-web" onClick={hold}>
                    Acme web
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <button
                  aria-label="Show hidden levels"
                  className="rounded-md hover:text-foreground"
                  onClick={() => setExpanded(true)}
                  type="button"
                >
                  <BreadcrumbEllipsis />
                </button>
              </BreadcrumbItem>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {expanded ? (
          <div className="mt-3">
            <button
              className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground text-xs hover:bg-accent hover:text-accent-foreground"
              onClick={() => setExpanded(false)}
              type="button"
            >
              Collapse again
            </button>
          </div>
        ) : null}
      </State>

      <State
        breaks="A link that renders as a plain a when the app needs its router link, so every click is a full page load. asChild puts the link styling on the element you pass."
        code={`<BreadcrumbLink asChild>
  <Link href="/projects">Projects</Link>
</BreadcrumbLink>`}
        id="as-child"
        note="Here the child is an anchor with its own attributes; in an app it would be the router's Link. Tab to it."
        title="As a custom link, with an icon"
      >
        <Breadcrumb aria-label="Trail with icon">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a className="inline-flex items-center gap-1.5" href="/" onClick={hold}>
                  <Home className="size-4" />
                  Home
                </a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </State>

      <State
        breaks="A trail on a top-level page that still draws a separator and an empty link. The first page has only BreadcrumbPage."
        id="single"
        title="Current page only"
      >
        <Breadcrumb aria-label="Single level">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </State>

      <State
        breaks="A deep trail that forces a horizontal scrollbar, or a long label that is cut off with no way to read it. The list wraps onto more lines instead; collapse the middle once it is too tall."
        id="overflow"
        note="Left: eight levels in a narrow container. Right: a very long label for the current page."
        title="Overflow — deep trail and long label"
      >
        <Row align="start">
          <div className="w-64 rounded-lg bg-background p-3">
            <Breadcrumb aria-label="Deep trail">
              <BreadcrumbList>
                {DEEP.map((label, index) => (
                  <React.Fragment key={label}>
                    <BreadcrumbItem>
                      {index === DEEP.length - 1 ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href="/" onClick={hold}>
                          {label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < DEEP.length - 1 ? <BreadcrumbSeparator /> : null}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="w-64 rounded-lg bg-background p-3">
            <Breadcrumb aria-label="Long label">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" onClick={hold}>
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{LONG_LABEL}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </Row>
      </State>

      <State
        breaks="A custom separator that points one way (such as →) is drawn as given, so in a right-to-left page it points back toward the root of the trail. The built-in chevron mirrors; a symmetric mark such as / reads the same either way."
        id="rtl"
        note="The same trail inside dir=rtl. The order follows the writing direction and the default chevron on top mirrors to point left, toward the trail's end. The slash below reads the same in both directions."
        title="Right-to-left"
      >
        <div dir="rtl">
          <Stack>
            <Breadcrumb aria-label="Chevron trail">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" onClick={hold}>
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects" onClick={hold}>
                    Projects
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Breadcrumb aria-label="Slash trail">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" onClick={hold}>
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects" onClick={hold}>
                    Projects
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Stack>
        </div>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-states"
        note="Breadcrumb has no disabled, loading or error state. It is navigation: a level you cannot visit is plain text, not a disabled link, and a trail that is still loading should not render yet."
        title="States Breadcrumb deliberately does not have"
      >
        <Breadcrumb aria-label="Unavailable level">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" onClick={hold}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>Archived projects</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </State>

      <State
        breaks="Focus landing on the current page or on separators, which adds dead stops. Only the links are tab stops."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab / Shift+Tab", does: "moves between the links, in trail order." },
            { keys: "Enter", does: "follows the focused link." },
            {
              keys: "last item",
              does: "the current page and the separators are skipped; they are not focusable.",
            },
          ]}
        >
          <Breadcrumb aria-label="Keyboard trail">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" onClick={hold}>
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/projects" onClick={hold}>
                  Projects
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </KeyboardPath>
      </State>

      <Aside title="The separator prop on Breadcrumb">
        <p>
          <code>Breadcrumb</code> reads its <code>separator</code> prop and uses it for every{" "}
          <code>BreadcrumbSeparator</code> that has no children of its own. It is no longer
          forwarded to the <code>nav</code> element. A <code>Breadcrumb</code> with no children
          renders nothing, so there is no empty landmark.
        </p>
      </Aside>
    </DemoPage>
  );
}
