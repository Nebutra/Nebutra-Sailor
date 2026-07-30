"use client";

import { Plus } from "@nebutra/icons";
import { PageHeader } from "@nebutra/ui/layout";
import { Badge, Button } from "@nebutra/ui/primitives";
import { Aside, DemoPage, LONG_LABEL, Stack, State } from "../demo-kit";

export default function PageHeaderDemo() {
  return (
    <DemoPage>
      <State
        breaks="Every page inventing its own title size and bottom spacing. This component fixes both, which is the only reason a dashboard's pages look like one product."
        id="default"
        note="Title, description and an action slot. The h1 is the page's real heading."
        title="Default"
      >
        <div className="rounded-lg bg-background p-6">
          <PageHeader
            actions={<Button prefix={<Plus />}>Invite member</Button>}
            description="Manage who can access this workspace and what they can do."
            title="Team"
          />
        </div>
      </State>

      <State
        breaks="A header with no description that leaves a gap where the description would have been, so pages with and without one do not line up."
        id="minimal"
        note="Title only, title + description, and title + actions."
        title="Optional slots"
      >
        <Stack>
          {[
            { label: "title only", props: { title: "Team" } },
            {
              label: "title + description",
              props: { title: "Team", description: "Manage workspace access." },
            },
            {
              label: "title + actions",
              props: { title: "Team", actions: <Button size="sm">Invite</Button> },
            },
          ].map((entry) => (
            <div key={entry.label}>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">{entry.label}</div>
              <div className="rounded-lg bg-background p-6">
                <PageHeader {...entry.props} />
              </div>
            </div>
          ))}
        </Stack>
      </State>

      <State
        breaks="Three actions that wrap under the title on a narrow viewport and push the content down by a whole row. Narrow your window on this one — the component switches from a row to a column at sm."
        id="overflow"
        note="A long title with three actions, and the same header in a narrow container."
        title="Overflow — long title and several actions"
      >
        <Stack>
          <div className="rounded-lg bg-background p-6">
            <PageHeader
              actions={
                <>
                  <Button size="sm" variant="outline">
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    Settings
                  </Button>
                  <Button size="sm">Invite member</Button>
                </>
              }
              description={LONG_LABEL}
              title={LONG_LABEL}
            />
          </div>
          <div className="max-w-[20rem] rounded-lg bg-background p-4">
            <PageHeader
              actions={<Button size="sm">Invite member</Button>}
              description="Manage who can access this workspace."
              title="Team and permissions"
            />
          </div>
        </Stack>
      </State>

      <State
        breaks="A loading page that renders a header with an empty title, which reads as broken. The header should hold its shape while the page below it loads."
        id="loading"
        note="The header stays; only the body below it is loading. There is no loading prop — this is the composition."
        title="While the page below is loading"
      >
        <div className="rounded-lg bg-background p-6">
          <PageHeader
            actions={
              <Button loading size="sm">
                Invite member
              </Button>
            }
            description="Manage who can access this workspace."
            title="Team"
          />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div className="h-4 w-full animate-pulse rounded bg-muted" key={i} />
            ))}
          </div>
        </div>
      </State>

      <State
        breaks="Status shoved into the title string, which breaks the heading text for a screen reader. It belongs beside the title as its own element."
        id="with-status"
        note="A badge in the actions slot rather than concatenated into the title."
        title="With status"
      >
        <div className="rounded-lg bg-background p-6">
          <PageHeader
            actions={
              <>
                <Badge variant="green-subtle">Healthy</Badge>
                <Button size="sm" variant="outline">
                  Logs
                </Button>
              </>
            }
            description="eu-central-1 · 4 replicas"
            title="Analytics cluster"
          />
        </div>
      </State>

      <Aside title="One h1 per page">
        <p>
          PageHeader renders an <code>h1</code>. Two of them on one page is a document-outline
          defect, so a nested panel heading is not this component's job — use a plain heading, or{" "}
          <code>Card.Title</code>. There is no keyboard path here; the only focusable things are
          whatever the caller puts in <code>actions</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
