"use client";

/**
 * The four modal surfaces, each opened by its own trigger.
 *
 * A pattern page that only describes when to reach for a Sheet over a Dialog is
 * asking the reader to imagine the difference. These open. The distinction the
 * table below them makes — blocking versus anchored, edge-attached versus
 * centred, scrollable versus not — is the kind you settle by opening both.
 */

import { Inbox } from "@nebutra/icons";
import { EmptyState, ErrorState, LoadingState } from "@nebutra/ui/layout";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Field,
  Input,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  Select,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Table,
  Tabs,
  Textarea,
} from "@nebutra/ui/primitives";
import * as React from "react";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm">
      {children}
      <code className="font-mono text-[11px] text-muted-foreground">{label}</code>
    </div>
  );
}

export function ModalitySpecimens() {
  const [confirmation, setConfirmation] = React.useState("");
  const required = "sailor-web";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Frame label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Delete workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Delete {required}</DialogTitle>
            <DialogDescription>
              This removes every deployment and cannot be undone. Type the project name to confirm.
            </DialogDescription>
            <Input
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={required}
              value={confirmation}
            />
            <DialogFooter>
              {/* The gate is the point of the specimen: a destructive dialog
                  whose confirm button is live from the moment it opens has not
                  actually asked anything. */}
              <Button disabled={confirmation !== required} size="sm" variant="destructive">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Frame>

      <Frame label="Sheet">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              Edit settings
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Project settings</SheetTitle>
              <SheetDescription>
                Slides in from the edge and scrolls, so it holds a form a dialog could not.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <Button size="sm">Save</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Frame>

      <Frame label="Drawer">
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="sm" variant="outline">
              Open drawer
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Deployments</DrawerTitle>
              <DrawerDescription>
                Attached to an edge and draggable — a phone-first surface.
              </DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      </Frame>

      <Frame label="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              Region details
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 text-[13px]">
            Anchored to its trigger and non-blocking. Dismisses on outside click or Escape.
          </PopoverContent>
        </Popover>
      </Frame>
    </div>
  );
}

/* ── the other patterns' specimens ─────────────────────────────────────── */

export function EmptyStateSpecimens() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {[
        {
          label: "EmptyState",
          node: (
            <EmptyState
              description="Connect a repository and every push builds a preview."
              icon={<Inbox />}
              title="Nothing deployed yet"
            />
          ),
        },
        { label: "LoadingState", node: <LoadingState message="Fetching deployments…" /> },
        {
          label: "ErrorState",
          node: (
            <ErrorState
              errorId="dpl_7Hq2xR"
              message="The deployments API did not respond within 10 seconds."
              title="Couldn't load deployments"
            />
          ),
        },
      ].map((item) => (
        <div
          className="flex min-h-[180px] flex-col justify-between gap-4 rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm"
          key={item.label}
        >
          <div className="flex flex-1 items-center justify-center">{item.node}</div>
          <code className="text-center font-mono text-[11px] text-muted-foreground">
            {item.label}
          </code>
        </div>
      ))}
    </div>
  );
}

export function FormSpecimens() {
  const [choice, setChoice] = React.useState("iad1");
  return (
    <div className="grid max-w-3xl gap-5 rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm sm:grid-cols-2">
      <Field htmlFor="pattern-name" label="Project name">
        <Input id="pattern-name" placeholder="sailor-web" />
      </Field>
      <Field htmlFor="pattern-region" label="Region">
        <Select
          id="pattern-region"
          onValueChange={(value) => setChoice(value ?? "iad1")}
          options={[
            { value: "iad1", label: "Washington, D.C." },
            { value: "sfo1", label: "San Francisco" },
            { value: "fra1", label: "Frankfurt" },
          ]}
          value={choice}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field htmlFor="pattern-notes" label="Release notes">
          <Textarea id="pattern-notes" placeholder="What changed in this release?" rows={2} />
        </Field>
      </div>
      <CheckboxGroup label="Notify me when">
        <Checkbox defaultChecked>A deploy fails</Checkbox>
        <Checkbox>A deploy succeeds</Checkbox>
      </CheckboxGroup>
      <RadioGroup defaultValue="preview" label="Deploy target">
        <RadioGroup.Item value="preview">Preview</RadioGroup.Item>
        <RadioGroup.Item value="production">Production</RadioGroup.Item>
      </RadioGroup>
    </div>
  );
}

export function TableSpecimens() {
  return (
    <div className="max-w-3xl rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm">
      <Table>
        <Table.Caption>Numeric columns take `numeric` on the head and the cell.</Table.Caption>
        <Table.Header>
          <Table.Row>
            <Table.Head>Region</Table.Head>
            <Table.Head numeric>Requests</Table.Head>
            <Table.Head numeric>p95</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body interactive>
          {[
            { region: "Washington, D.C.", requests: 1_284_902, p95: "184 ms" },
            { region: "Frankfurt", requests: 620_118, p95: "241 ms" },
            { region: "Tokyo", requests: 402_771, p95: "402 ms" },
          ].map((row) => (
            <Table.Row key={row.region}>
              <Table.Cell>{row.region}</Table.Cell>
              <Table.Cell numeric>{row.requests.toLocaleString()}</Table.Cell>
              <Table.Cell numeric>{row.p95}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}

export function NavigationSpecimens() {
  const [view, setView] = React.useState("overview");
  return (
    <div className="flex max-w-3xl flex-col gap-6 rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm">
      <div>
        <code className="mb-2 block font-mono text-[11px] text-muted-foreground">
          Tabs — peer views
        </code>
        <Tabs
          aria-label="Project views"
          selected={view}
          setSelected={setView}
          tabs={[
            { title: "Overview", value: "overview" },
            { title: "Activity", value: "activity" },
            { title: "Settings", value: "settings" },
          ]}
        />
      </div>
      <Separator />
      <div>
        <code className="mb-2 block font-mono text-[11px] text-muted-foreground">
          Pagination — siblings in a sequence
        </code>
        <Pagination />
      </div>
    </div>
  );
}

/**
 * The three container widths, drawn at their real values.
 *
 * A table of max-widths is a table of numbers; the ratio between them is the
 * thing that decides which one a section wants, and that only shows up when
 * they sit on top of each other.
 */
const ROWS = [
  { token: "--container-text", css: "var(--container-text)" },
  { token: "--container-content", css: "var(--container-content)" },
  { token: "--container-wide", css: "var(--container-wide)" },
] as const;

export function LayoutSpecimens() {
  const track = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number | null>(null);

  // Fit the widest container to the track, and take the other two down with it.
  //
  // This was a constant — 0.66, chosen because it looked about right in the
  // article column on a laptop. It is a guess about a width nothing guarantees:
  // --container-wide is 1400px, 66% of that is 924px, and the column here is
  // narrower than that, so the widest bar ran out past the card and the caption
  // underneath said the proportions were exact while the longest one was
  // clipped. Any language free to change --container-wide, and any viewport
  // other than the one it was eyeballed at, re-breaks it.
  //
  // Measured instead: the widest bar is defined to fill the track, so it cannot
  // overflow, and the ratio is preserved because one factor scales all three.
  React.useEffect(() => {
    const node = track.current;
    if (!node) return;
    const measure = () => {
      const available = node.clientWidth;
      const widest = Number.parseFloat(getComputedStyle(node).getPropertyValue("--container-wide"));
      if (!available || !widest) return;
      // Never enlarge: on a wide viewport the real widths are the honest
      // drawing, and a bar stretched past its token is a lie about the token.
      setScale(Math.min(1, available / widest));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="rounded-[var(--radius-lg)] bg-card p-6 shadow-ambient-sm">
      <div className="flex flex-col gap-3 overflow-hidden" ref={track}>
        {ROWS.map((row) => (
          <div className="flex flex-col gap-1" key={row.token}>
            <code className="font-mono text-[11px] text-muted-foreground">{row.token}</code>
            <div
              className="h-6 rounded-[var(--radius-sm)] bg-primary/15"
              style={{ width: scale === null ? 0 : `calc(${row.css} * ${scale})` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        {scale !== null && scale < 1
          ? `Shown at ${Math.round(scale * 100)}% so all three fit \u2014 the proportions are exact.`
          : "Drawn at their real widths."}
      </p>
    </div>
  );
}
