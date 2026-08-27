"use client";

import { Inbox } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import { Aside, DemoPage, LONG_PARAGRAPH, Row, Specimen, Stack, State } from "../demo-kit";

const TONES = ["default", "branded", "subtle"] as const;
const SIZES = ["sm", "md", "lg"] as const;

export default function EmptyStateDemo() {
  return (
    <DemoPage>
      <State
        breaks='Copy that says nothing. "No items yet" tells the reader what they can already see; it does not tell them what to do next. That family of string is lint-banned in apps/web, and this state is the alternative.'
        id="default"
        note="Title, description and a primary action. The title says what is missing; the description says how to change that."
        title="Default"
      >
        <div className="rounded-lg bg-background p-6">
          <EmptyState
            action={<Button>Connect a repository</Button>}
            description="Connect a Git repository and every push will build a preview."
            icon={<Inbox />}
            title="Nothing has been deployed here"
          />
        </div>
      </State>

      <State
        breaks="A tone that changes the anchor but not the spacing, so the three read as three different components. branded substitutes a BrandMark when no mascot is given."
        id="tones"
        note="All three tones, same content."
        title="Tones"
      >
        <Stack>
          {TONES.map((tone) => (
            <div key={tone}>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">
                tone="{tone}"{tone === "default" ? " (default)" : ""}
              </div>
              <div className="rounded-lg bg-background p-6">
                <EmptyState
                  action={<Button size="sm">Connect a repository</Button>}
                  description="Connect a Git repository and every push will build a preview."
                  title="Nothing has been deployed here"
                  tone={tone}
                />
              </div>
            </div>
          ))}
        </Stack>
      </State>

      <State
        breaks="A size that scales the type but not the vertical rhythm, so the small one looks cramped inside a panel."
        id="sizes"
        note="Three sizes. sm is for inside a panel; lg is for a whole page."
        title="Sizes"
      >
        <Stack>
          {SIZES.map((size) => (
            <div key={size}>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">size="{size}"</div>
              <div className="rounded-lg bg-background p-4">
                <EmptyState
                  description="Connect a Git repository to start."
                  size={size}
                  title="Nothing deployed"
                />
              </div>
            </div>
          ))}
        </Stack>
      </State>

      <State
        breaks="Two actions of equal weight, leaving the reader to decide which is the point. The secondary action must read as secondary."
        id="actions"
        note="Primary only, and primary plus secondary."
        title="Actions"
      >
        <Row align="start">
          <Specimen label="one action">
            <div className="w-72 rounded-lg bg-background p-4">
              <EmptyState
                action={<Button size="sm">Connect a repository</Button>}
                size="sm"
                title="Nothing deployed"
              />
            </div>
          </Specimen>
          <Specimen label="two actions">
            <div className="w-72 rounded-lg bg-background p-4">
              <EmptyState
                action={<Button size="sm">Connect a repository</Button>}
                secondaryAction={
                  <Button size="sm" variant="ghost">
                    Import a template
                  </Button>
                }
                size="sm"
                title="Nothing deployed"
              />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="Title-only, which is the degenerate case this component makes too easy. It renders, and it says nothing useful — shown here so the difference from the default state above is visible side by side."
        id="minimal"
        note="Title only. Compare it against the first state on this page."
        title="Title only — the weak version"
      >
        <div className="rounded-lg bg-background p-6">
          <EmptyState title="No results" />
        </div>
      </State>

      <State
        breaks="A long description that runs the full width of a wide panel, which is unreadable, or one that clips in a narrow one."
        id="overflow"
        note="A long description in a wide container and in a narrow one."
        title="Overflow"
      >
        <Stack>
          <div className="rounded-lg bg-background p-6">
            <EmptyState
              action={<Button size="sm">Connect a repository</Button>}
              description={LONG_PARAGRAPH}
              title="Nothing has been deployed to this environment yet"
            />
          </div>
          <div className="max-w-[16rem] rounded-lg bg-background p-4">
            <EmptyState description={LONG_PARAGRAPH} size="sm" title="Nothing deployed here yet" />
          </div>
        </Stack>
      </State>

      <Aside title="Empty is not the same as filtered-to-nothing">
        <p>
          Two different states are usually rendered with the same component and should not be. "You
          have not created anything" needs a create action. "Your filter matched nothing" needs a
          clear-filter action and must not suggest creating anything. The component cannot tell them
          apart — the caller has to.
        </p>
      </Aside>
    </DemoPage>
  );
}
