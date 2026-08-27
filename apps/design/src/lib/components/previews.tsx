"use client";

/**
 * One specimen per documented component, for the index.
 *
 * The index used to describe ninety-six components in prose and render none of
 * them, which is the difference between a catalogue and a design system: you
 * could read the whole page and never see a single control. Each card now
 * renders the real export.
 *
 * Which single specimen best represents a component is an editorial call and
 * there is no source to derive it from, so this map is hand-written — but it is
 * the *only* hand-written part, it lives in one file, and a slug with no entry
 * says so on the card instead of rendering an empty box.
 */

import { Cloud, Inbox, Plus } from "@nebutra/icons";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Card } from "@nebutra/ui/patterns";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AnimateIn,
  Avatar,
  Badge,
  Button,
  Checkbox,
  CheckboxGroup,
  Combobox,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  Input,
  Kbd,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  Select,
  Separator,
  SkeletonText,
  Slider,
  Spinner,
  StatusDot,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";

const REGIONS = [
  { value: "iad1", label: "Washington, D.C." },
  { value: "sfo1", label: "San Francisco" },
  { value: "fra1", label: "Frankfurt" },
];

/**
 * An inline data URI rather than a remote avatar: the index must render the
 * same offline, in CI and in a sandbox. A grid of broken image icons is a worse
 * first impression than no avatars at all.
 */
const FACE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" fill="#1f2937"/>
       <circle cx="32" cy="24" r="11" fill="#9ca3af"/>
       <path d="M8 64c0-13.3 10.7-24 24-24s24 10.7 24 24z" fill="#9ca3af"/>
     </svg>`,
  );

/* ── the few that need local state ─────────────────────────────────────── */

function TabsPreview() {
  const [selected, setSelected] = React.useState("overview");
  return (
    <Tabs
      aria-label="Views"
      selected={selected}
      setSelected={setSelected}
      tabs={[
        { title: "Overview", value: "overview" },
        { title: "Logs", value: "logs" },
      ]}
    />
  );
}

function TogglePreview() {
  const [checked, setChecked] = React.useState(true);
  return (
    <Toggle checked={checked} onChange={setChecked}>
      Auto-deploy
    </Toggle>
  );
}

function SwitchPreview() {
  const [value, setValue] = React.useState("preview");
  return (
    <Switch name="preview-switch" onValueChange={setValue} value={value}>
      <Switch.Control label="Source" value="source" />
      <Switch.Control label="Preview" value="preview" />
    </Switch>
  );
}

function SliderPreview() {
  const [value, setValue] = React.useState([48]);
  return (
    <div className="w-full">
      <Slider max={96} min={8} onValueChange={setValue} step={4} value={value} />
    </div>
  );
}

/* ── the map ───────────────────────────────────────────────────────────── */

const PREVIEWS: Record<string, React.ReactNode> = {
  badge: (
    <div className="flex flex-wrap gap-1.5">
      <Badge>default</Badge>
      <Badge variant="success">success</Badge>
      <Badge variant="destructive">failed</Badge>
    </div>
  ),
  button: (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm">Deploy</Button>
      <Button size="sm" variant="secondary">
        Logs
      </Button>
      <Button size="sm" variant="ghost">
        Cancel
      </Button>
    </div>
  ),
  input: (
    <div className="w-full">
      <Input placeholder="branch or commit" />
    </div>
  ),
  textarea: (
    <div className="w-full">
      <Textarea placeholder="Release notes…" rows={2} />
    </div>
  ),
  label: <Label htmlFor="preview-label">Deployment region</Label>,
  field: (
    <div className="w-full">
      <Field htmlFor="preview-field" label="Email">
        <Input id="preview-field" placeholder="you@example.com" type="email" />
      </Field>
    </div>
  ),
  select: (
    <div className="w-full">
      <Select options={REGIONS} placeholder="Choose a region" />
    </div>
  ),
  combobox: <Combobox options={REGIONS} placeholder="Select a region" width={220} />,
  checkbox: (
    <CheckboxGroup label="Notifications">
      <Checkbox defaultChecked>Deploy failed</Checkbox>
      <Checkbox>Deploy succeeded</Checkbox>
    </CheckboxGroup>
  ),
  "radio-group": (
    <RadioGroup defaultValue="iad1" label="Region">
      <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
      <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
    </RadioGroup>
  ),
  toggle: <TogglePreview />,
  switch: <SwitchPreview />,
  slider: <SliderPreview />,
  tabs: <TabsPreview />,
  progress: (
    <div className="w-full">
      <Progress value={72} />
    </div>
  ),
  "status-dot": (
    <div className="flex flex-col gap-1.5">
      <StatusDot label state="READY" />
      <StatusDot label state="BUILDING" />
      <StatusDot label state="ERROR" />
    </div>
  ),
  spinner: <Spinner label="Loading" />,
  skeleton: (
    <div className="w-full">
      <SkeletonText isLoaded={false} lines={3} />
    </div>
  ),
  avatar: (
    <div className="flex items-center gap-2">
      <Avatar size="sm" src={FACE} title="Ada" />
      <Avatar size="md" src={FACE} title="Ada" />
      <Avatar size="lg" src={FACE} title="Ada" />
    </div>
  ),
  kbd: (
    <div className="flex items-center gap-1.5">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </div>
  ),
  separator: (
    <div className="flex w-full flex-col gap-2 text-[12px] text-muted-foreground">
      <span>Production</span>
      <Separator />
      <span>Preview</span>
    </div>
  ),
  alert: (
    <Alert variant="info">
      <AlertIcon>
        <Cloud />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>Build cache restored</AlertTitle>
        <AlertDescription>Reused 412 modules from the previous deployment.</AlertDescription>
      </AlertContent>
    </Alert>
  ),
  tooltip: (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="sm" variant="outline">
          Hover me
        </Button>
      </TooltipTrigger>
      <TooltipContent>Add this project to your library.</TooltipContent>
    </Tooltip>
  ),
  popover: (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          Open popover
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-4 text-[13px]">
        Anchored surface. Dismisses on outside click and Escape.
      </PopoverContent>
    </Popover>
  ),
  "dropdown-menu": (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary">
          Open menu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>Redeploy</DropdownMenuItem>
        <DropdownMenuItem>View logs</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  dialog: (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Delete workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Delete workspace</DialogTitle>
      </DialogContent>
    </Dialog>
  ),
  table: (
    <div className="w-full">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>Region</Table.Head>
            <Table.Head numeric>p95</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Frankfurt</Table.Cell>
            <Table.Cell numeric>184 ms</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Tokyo</Table.Cell>
            <Table.Cell numeric>402 ms</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
  card: (
    <div className="w-full">
      <Card padding="sm" variant="elevated">
        <Card.Header>
          <Card.Title>sailor-web</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Description>Compound surface with header, body and footer.</Card.Description>
        </Card.Body>
      </Card>
    </div>
  ),
  "animate-in": (
    <AnimateIn preset="emerge">
      <div className="rounded-panel bg-muted px-3 py-2 text-[13px] text-muted-foreground">
        The only sanctioned entrance
      </div>
    </AnimateIn>
  ),
  "page-header": (
    <div className="w-full">
      <PageHeader
        actions={
          <Button prefix={<Plus />} size="sm">
            Invite
          </Button>
        }
        description="Who can access this workspace."
        title="Team"
      />
    </div>
  ),
  "empty-state": (
    <div className="w-full">
      <EmptyState
        description="Connect a repository and every push builds a preview."
        icon={<Inbox />}
        title="Nothing deployed yet"
      />
    </div>
  ),
  "loading-state": (
    <div className="w-full">
      <LoadingState message="Fetching deployments…" />
    </div>
  ),
  "error-state": (
    <div className="w-full">
      <ErrorState message="The deployments API did not respond." title="Couldn’t load" />
    </div>
  ),
};

/**
 * The lookup has to happen inside the client boundary — a server component can
 * import a component from this module, but not index into an object it exports.
 *
 * A slug with no specimen says so, so a component added to the registry without
 * one reads as a gap rather than as a rendering fault.
 */
export function ComponentPreview({ slug, name }: { slug: string; name: string }) {
  const preview = PREVIEWS[slug];
  if (preview) return <>{preview}</>;
  return (
    <span className="font-mono text-[12px] text-muted-foreground">{name} — no specimen yet</span>
  );
}
