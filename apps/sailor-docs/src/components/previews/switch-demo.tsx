"use client";

import { Switch } from "@nebutra/ui/primitives";
import { Moon, Sun } from "lucide-react";

export function SwitchDemo() {
  return (
    <div className="gap-8 max-w-sm flex w-full flex-col">
      <div className="gap-2 flex flex-col">
        <h4 className="text-sm font-medium text-muted-foreground">Default</h4>
        <Switch name="default">
          <Switch.Control defaultChecked label="List view" value="list" />
          <Switch.Control label="Grid view" value="grid" />
        </Switch>
      </div>

      <div className="gap-2 flex flex-col">
        <h4 className="text-sm font-medium text-muted-foreground">Disabled</h4>
        <Switch name="disabled">
          <Switch.Control defaultChecked disabled label="List view" value="list" />
          <Switch.Control disabled label="Grid view" value="grid" />
        </Switch>
      </div>

      <div className="gap-2 flex flex-col">
        <h4 className="text-sm font-medium text-muted-foreground">Sizes</h4>
        <div className="gap-4 flex items-center">
          <Switch name="size-sm" size="small">
            <Switch.Control label="Small" value="sm" defaultChecked />
            <Switch.Control label="Auto" value="auto" />
          </Switch>
          <Switch name="size-md" size="medium">
            <Switch.Control label="Medium" value="md" defaultChecked />
            <Switch.Control label="Auto" value="auto" />
          </Switch>
          <Switch name="size-lg" size="large">
            <Switch.Control label="Large" value="lg" defaultChecked />
            <Switch.Control label="Auto" value="auto" />
          </Switch>
        </div>
      </div>

      <div className="gap-2 flex flex-col">
        <h4 className="text-sm font-medium text-muted-foreground">Icons</h4>
        <div className="gap-4 flex">
          <Switch name="theme" size="small">
            <Switch.Control icon={<Sun className="h-4 w-4" />} value="light" defaultChecked />
            <Switch.Control icon={<Moon className="h-4 w-4" />} value="dark" />
          </Switch>
        </div>
      </div>
    </div>
  );
}
