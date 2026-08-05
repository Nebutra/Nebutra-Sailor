"use client";

/**
 * The four modal surfaces, each opened by its own trigger.
 *
 * A pattern page that only describes when to reach for a Sheet over a Dialog is
 * asking the reader to imagine the difference. These open. The distinction the
 * table below them makes — blocking versus anchored, edge-attached versus
 * centred, scrollable versus not — is the kind you settle by opening both.
 */

import {
  Button,
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
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
