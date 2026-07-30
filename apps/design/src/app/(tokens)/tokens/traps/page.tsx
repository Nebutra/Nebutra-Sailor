import { CrossCircle, Warning } from "@nebutra/icons";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Mono, Note, PageHeader, Section } from "../_components/primitives";

export const metadata: Metadata = {
  title: "Two traps — tokens",
  description:
    "The two ways a correct token silently renders nothing: a bare var() in a colour slot, and one bad colour voiding an entire background-image declaration. Both shown live.",
};

/**
 * A snippet that must NOT be copied.
 *
 * `select-none` is not decoration. The failure this page exists to prevent
 * already happened once in `apps/design-docs`, where a "Good" example was
 * teaching a bug and that bug reached 31 call sites. A broken example that can be
 * dragged, copied and pasted is a broken example waiting to ship, so this one
 * cannot be selected — and is labelled at both ends.
 */
function Broken({ children, why }: { children: ReactNode; why: string }) {
  return (
    <figure className="rounded-lg bg-destructive/10 p-4">
      {/* The caption comes FIRST so a screen reader reaches the warning before
          the code, and so it is the first thing read in the DOM order. */}
      <figcaption className="mb-2.5 flex items-center gap-1.5 font-medium font-mono text-[11px] uppercase tracking-widest">
        <CrossCircle className="h-3.5 w-3.5" aria-hidden="true" />
        broken — do not copy
      </figcaption>
      <pre className="select-none overflow-x-auto font-mono text-[12.5px] text-foreground/70 leading-relaxed line-through decoration-1 decoration-destructive/50">
        {children}
      </pre>
      <p className="mt-2.5 text-[12.5px] text-muted-foreground leading-relaxed">{why}</p>
    </figure>
  );
}

/** The snippet that works, and is meant to be taken. */
function Works({ children, why }: { children: ReactNode; why: string }) {
  return (
    <figure className="rounded-lg bg-success/10 p-4">
      <figcaption className="mb-2.5 font-medium font-mono text-[11px] uppercase tracking-widest">
        use this
      </figcaption>
      <pre className="overflow-x-auto font-mono text-[12.5px] text-foreground leading-relaxed">
        {children}
      </pre>
      <p className="mt-2.5 text-[12.5px] text-muted-foreground leading-relaxed">{why}</p>
    </figure>
  );
}

/**
 * The wrong form, as display text. Hoisted to a constant so the suppression
 * comment stays adjacent to the string no matter how the formatter wraps JSX.
 */
const BROKEN_GRADIENT_SNIPPET =
  // @allow-ui-contract: code-fence string showing the wrong form, not applied CSS
  "background-image:\n  radial-gradient(… hsl(var(--accent)) …),\n  linear-gradient(120deg, var(--primary), transparent);";

/** A live rendering, labelled with what you should be seeing. */
function Demo({ label, expect, children }: { label: string; expect: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <div className="rounded-lg bg-card p-5 shadow-ambient-sm">{children}</div>
      <p className="mt-2 text-[12px] text-muted-foreground">{expect}</p>
    </div>
  );
}

export default function TrapsPage() {
  return (
    <div>
      <PageHeader eyebrow="tokens / traps" title="Two ways a correct token renders nothing">
        <p>
          Both traps below share a shape: the CSS is <em>syntactically</em> plausible, the token
          name is right, the value in the stylesheet is right — and the browser silently discards
          the declaration. Nothing throws. Nothing logs. The element just inherits, and in a
          dark-on-light layout that often looks close enough to pass review.
        </p>
        <p>
          Everything on this page is rendered live, on this page, right now. The broken examples are
          really broken; that is the demonstration. They are also <strong>not selectable</strong>,
          so they cannot be copied out of here by accident.
        </p>
      </PageHeader>

      <Section
        title="Trap 1 — a bare var() in a colour slot"
        note={
          <>
            <p>
              The semantic tokens do not hold colours. They hold{" "}
              <strong>bare HSL channel triples</strong>: <Mono>--primary: 222.8 85% 55.7%</Mono>,
              with no <Mono>hsl(</Mono> around it. That is what lets one variable serve{" "}
              <Mono>hsl(var(--primary))</Mono> and <Mono>hsl(var(--primary) / 0.1)</Mono> without a
              second token for the translucent case.
            </p>
            <p>
              {/* @allow-ui-contract: prose naming the anti-pattern, not a style declaration */}
              The cost is that <Mono>color: var(--primary)</Mono> substitutes to{" "}
              <Mono>color: 222.8 85% 55.7%</Mono>. That is not a colour, so the declaration is
              invalid at computed-value time and is thrown away — along with any fallback you
              thought you had.
            </p>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo
            label="bare var()"
            expect="Renders in the inherited body colour. The declaration was discarded; nothing indicates that."
          >
            {/* @allow-ui-contract: intentionally invalid — this IS the live demonstration */}
            <p className="font-semibold text-2xl" style={{ color: "var(--primary)" }}>
              Get started
            </p>
          </Demo>
          <Demo label="hsl(var())" expect="Renders in the action fill, as intended.">
            <p className="font-semibold text-2xl" style={{ color: "hsl(var(--primary))" }}>
              Get started
            </p>
          </Demo>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* @allow-ui-contract: code-fence string showing the wrong form, not applied CSS */}
          <Broken why="var(--primary) substitutes to a channel triple. Not a colour, so the whole declaration is dropped.">
            {/* @allow-ui-contract: code-fence string showing the wrong form, not applied CSS */}
            {"color: var(--primary);\nbackground-color: var(--card);"}
          </Broken>
          <Works why="Wrap the channels in the colour function they were stored for. The slash form gives you opacity for free.">
            {`color: hsl(var(--primary));
background-color: hsl(var(--card));
border-color: hsl(var(--border) / 0.4);`}
          </Works>
        </div>

        <div className="mt-5">
          <Note>
            In Tailwind, prefer the semantic utility and the question does not arise:{" "}
            <Mono>text-primary</Mono>, <Mono>bg-card</Mono>, <Mono>border-border</Mono>. The{" "}
            <Mono>@theme</Mono> block already wraps each token —{" "}
            <Mono>--color-primary: hsl(var(--primary))</Mono> — which is why the utilities are safe
            {/* @allow-ui-contract: prose naming the anti-pattern, not a style declaration */}
            and a raw <Mono>bg-[var(--primary)]</Mono> is not.
          </Note>
        </div>
      </Section>

      <Section
        title="Trap 2 — one bad colour voids the whole declaration"
        note={
          <>
            <p>
              CSS declarations are all-or-nothing. A <Mono>background-image</Mono> with several
              comma separated layers is <em>one</em> declaration, so a single unresolvable colour
              anywhere inside it does not degrade that layer — it deletes every layer.
            </p>
            <p>
              This is trap 1 with a much larger blast radius, and it is harder to spot: a gradient
              that fails to appear reads as "the gradient is subtle" far more easily than missing
              text colour does.
            </p>
            <p>
              It has already shipped here. <Mono>--btn-default-stroke-gradient: transparent</Mono>{" "}
              sat in a <Mono>background-image</Mono> layer, so the declaration was dropped whole —
              and took the solid brand fill in the layer above it along with it. Every default{" "}
              <Mono>Button</Mono> rendered white text on no background. The incident is recorded in
              the header of <Mono>scripts/audit-css-var-types.mjs</Mono>, which exists because of
              it.
            </p>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo
            label="two layers, one bare var()"
            expect="Both layers are gone — including the radial wash that had nothing wrong with it. The panel is flat."
          >
            <div
              className="h-28 rounded-panel bg-muted"
              style={{
                backgroundImage: [
                  "radial-gradient(60% 80% at 20% 0%, hsl(var(--accent)) 0%, transparent 70%)",
                  // @allow-ui-contract: intentionally invalid — this IS the live demonstration
                  "linear-gradient(120deg, var(--primary) 0%, transparent 100%)",
                ].join(", "),
              }}
            />
          </Demo>
          <Demo
            label="both layers wrapped"
            expect="Both layers render: the radial wash and the linear sweep over it."
          >
            <div
              className="h-28 rounded-panel bg-muted"
              style={{
                backgroundImage: [
                  "radial-gradient(60% 80% at 20% 0%, hsl(var(--accent)) 0%, transparent 70%)",
                  "linear-gradient(120deg, hsl(var(--primary)) 0%, transparent 100%)",
                ].join(", "),
              }}
            />
          </Demo>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Broken why="The second layer is unparseable, so background-image as a whole is invalid and the first layer disappears with it. Nothing in the output says which layer was at fault.">
            {BROKEN_GRADIENT_SNIPPET}
          </Broken>
          <Works why="Every colour in every layer goes through a colour function. Check each stop, not just the first one.">
            {`background-image:
  radial-gradient(… hsl(var(--accent)) …),
  linear-gradient(120deg, hsl(var(--primary)), transparent);`}
          </Works>
        </div>

        <div className="mt-5">
          <Note>
            The same all-or-nothing rule applies to every shorthand and every multi-value property:{" "}
            <Mono>box-shadow</Mono>, <Mono>border</Mono>, <Mono>background</Mono>,{" "}
            <Mono>mask-image</Mono>. Shadows have a ramp for this reason — reach for{" "}
            <Mono>shadow-ambient-md</Mono> and no colour is ever hand-assembled.
          </Note>
        </div>
      </Section>

      <Section title="How to notice it yourself">
        <ul className="max-w-3xl space-y-3 text-[14px] text-muted-foreground leading-relaxed">
          <li className="flex gap-2.5">
            <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              In devtools, an invalid declaration is struck through in the Styles pane. If a token
              rule looks struck through, this is why — not a specificity problem.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              The tell in review is a <Mono>var(--…)</Mono> sitting directly in a colour position.
              Two families are safe there and are worth knowing apart: the 12-step scale (
              <Mono>--neutral-9</Mono>) and the brand aliases (<Mono>--brand-primary</Mono>) store
              full hex colours, so a bare <Mono>var()</Mono> is correct for those. The semantic tier
              never is. The colour page marks which is which per row.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              CI already checks for this class of mistake:{" "}
              <Mono>scripts/audit-css-var-types.mjs</Mono> resolves every <Mono>var()</Mono> in a
              built stylesheet and asks the browser, through <Mono>CSS.supports()</Mono>, whether it
              would keep the declaration. Static analysis cannot do that without re-implementing CSS
              grammar. If an app's built CSS is not in that job's input list, none of this is being
              checked for it.
            </span>
          </li>
        </ul>
      </Section>
    </div>
  );
}
