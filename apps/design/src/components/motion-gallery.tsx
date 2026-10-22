"use client";
// @brand-exempt: design-system documentation copy; it names the product in prose and carries no brand colour or domain literal.
// @primitive-exempt: the whole list row is the click target inside a Card; a Button would add chrome to the behaviour being demonstrated.

/**
 * Motion as it behaves in the components that ship.
 *
 * Only patterns that are in use, built from the real `@nebutra/ui` parts: a
 * dialog, a toast stack, a command palette, and a reorderable list. Each says
 * which tokens drive it and, where the answer is "none yet", says that too. A
 * gallery that only shows the flattering cases would be a screenshot, not a
 * reference.
 */

import {
  Button,
  Card,
  CommandMenu,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Toaster,
  toast,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { usePrefersReducedMotion } from "@/components/motion-kit";
import { readToken, readTokenMs } from "@/components/motion-playhead";

function Entry({
  title,
  tokens,
  children,
  demo,
}: {
  title: string;
  /** Which tokens drive the motion, in prose. */
  tokens: React.ReactNode;
  children?: React.ReactNode;
  demo: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-[var(--radius-lg)] border border-border p-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-foreground text-lg leading-heading tracking-heading">{title}</h3>
        <p className="m-0 text-neutral-11 text-sm leading-snug">{tokens}</p>
        {children}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">{demo}</div>
    </div>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[var(--radius-sm)] bg-muted px-1 py-0.5 font-mono text-2xs text-foreground">
      {children}
    </code>
  );
}

function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Open dialog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotate the signing key?</DialogTitle>
          <DialogDescription>
            Existing webhooks keep working for 24 hours, then stop.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button">Rotate</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToastDemo() {
  const count = React.useRef(0);
  const push = () => {
    count.current += 1;
    toast(`Deploy ${count.current} finished`, { description: "forge-web is live" });
  };
  return (
    <>
      <Button onClick={push} type="button" variant="outline">
        Push a toast
      </Button>
      <Button
        onClick={() => {
          push();
          push();
          push();
        }}
        type="button"
        variant="outline"
      >
        Push three
      </Button>
      <Button onClick={() => toast.dismiss()} type="button" variant="ghost">
        Clear
      </Button>
    </>
  );
}

const COMMANDS = [
  { heading: "Navigate", items: ["Go to tokens", "Go to components", "Go to motion lab"] },
  { heading: "Theme", items: ["Switch to light", "Switch to dark"] },
];

function PaletteDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="outline">
        Open palette
      </Button>
      <CommandMenu.Root
        description="Search commands and run actions."
        open={open}
        setOpen={setOpen}
      >
        <CommandMenu.Input placeholder="What do you need?" />
        <CommandMenu.List>
          <CommandMenu.Empty>No commands found.</CommandMenu.Empty>
          {COMMANDS.map((group) => (
            <CommandMenu.Group heading={group.heading} key={group.heading}>
              {group.items.map((item) => (
                <CommandMenu.Item callback={() => setOpen(false)} key={item} value={item}>
                  {item}
                </CommandMenu.Item>
              ))}
            </CommandMenu.Group>
          ))}
        </CommandMenu.List>
      </CommandMenu.Root>
    </>
  );
}

const ITEMS = ["Tokens", "Components", "Patterns", "Motion", "Icons"];

function shuffled(list: string[]): string[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as string, copy[i] as string];
  }
  return copy;
}

/**
 * FLIP: First (measure), Last (reorder), Invert (offset back), Play (release).
 * Rows are measured at their *visual* position, so a reorder in the middle of
 * another one starts from where each row currently is.
 */
function ReorderDemo() {
  const [order, setOrder] = React.useState(ITEMS);
  const reduced = usePrefersReducedMotion();
  const nodes = React.useRef(new Map<string, HTMLElement>());
  const before = React.useRef<Map<string, number> | null>(null);
  const running = React.useRef<Animation[]>([]);

  const reorder = (next: string[]) => {
    before.current = new Map(
      [...nodes.current].map(([key, el]) => [key, el.getBoundingClientRect().top]),
    );
    setOrder(next);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new order triggers the play step
  React.useLayoutEffect(() => {
    const from = before.current;
    before.current = null;
    if (!from) return;
    // Cancel first so every row is measured at its new resting place.
    for (const animation of running.current) animation.cancel();
    running.current = [];
    if (reduced) return;
    // WAAPI cannot take var(), so read the token rather than copy its value.
    const duration = readTokenMs("--spring-smooth-duration");
    const easing = readToken("--spring-smooth-easing");
    for (const [key, el] of nodes.current) {
      const previous = from.get(key);
      if (previous === undefined) continue;
      const delta = previous - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      running.current.push(
        el.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], {
          duration,
          easing,
        }),
      );
    }
  }, [order, reduced]);

  return (
    <div className="flex w-full flex-col gap-3">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {order.map((item) => (
          <li
            key={item}
            ref={(el) => {
              if (el) nodes.current.set(item, el);
              else nodes.current.delete(item);
            }}
          >
            <Card className="overflow-hidden" interactive variant="outline">
              <button
                className="w-full px-3 py-2 text-left text-foreground text-sm"
                onClick={() => reorder([item, ...order.filter((other) => other !== item)])}
                type="button"
              >
                {item}
              </button>
            </Card>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => reorder(shuffled(order))} size="sm" type="button" variant="outline">
          Shuffle
        </Button>
        <Button
          onClick={() => reorder([...order].reverse())}
          size="sm"
          type="button"
          variant="outline"
        >
          Reverse
        </Button>
      </div>
    </div>
  );
}

export function MotionGallery() {
  return (
    <>
      {/* The site has no global Toaster; this page owns the one it needs. */}
      <Toaster />
      <div className="grid gap-6 md:grid-cols-2">
        <Entry
          demo={<DialogDemo />}
          title="Dialog"
          tokens={
            <>
              The panel fades and scales up from 0.95 on <Token>--motion-duration-flow</Token> and
              leaves faster on <Token>--motion-duration-micro</Token>. The backdrop fades on the
              same two rails.
            </>
          }
        />
        <Entry
          demo={<ToastDemo />}
          title="Toast stack"
          tokens={
            <>
              Sonner owns the choreography: new toasts push older ones back, hover pauses and fans
              the stack out. Nebutra feeds it <Token>--toast-motion-duration</Token> and{" "}
              <Token>--toast-motion-easing</Token>. Toasts land in the corner of the viewport.
            </>
          }
        />
        <Entry
          demo={<ReorderDemo />}
          title="List reorder"
          tokens={
            <>
              No sortable primitive ships, so this is FLIP on the Web Animations API, role{" "}
              <Token>shared</Token>: <Token>--spring-smooth-duration</Token> and{" "}
              <Token>--spring-smooth-easing</Token>, read from the document. Reorder twice quickly
              and the rows retarget from where they are.
            </>
          }
        />
        <Entry
          demo={<PaletteDemo />}
          title="Command palette"
          tokens={
            <>
              The backdrop fades on the dialog rails. The panel itself has no enter or exit motion
              yet: <Token>commandSurface</Token> carries position and style, no transition. A gap
              this lab makes visible.
            </>
          }
        />
      </div>
    </>
  );
}
