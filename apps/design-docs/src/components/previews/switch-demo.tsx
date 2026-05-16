"use client";

import { GridSquare, ListUnordered } from "@nebutra/icons";
import { Switch } from "@nebutra/ui/primitives";

export function SwitchDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-muted-foreground text-sm">Default</h4>
        <Switch name="preview-default">
          <Switch.Control defaultChecked label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
        </Switch>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-muted-foreground text-sm">Disabled</h4>
        <Switch name="preview-disabled" disabled>
          <Switch.Control defaultChecked label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
        </Switch>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-muted-foreground text-sm">Sizes</h4>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Switch name="preview-small" size="small">
            <Switch.Control defaultChecked label="Source" value="source" />
            <Switch.Control label="Output" value="output" />
          </Switch>
          <Switch name="preview-medium">
            <Switch.Control defaultChecked label="Source" value="source" />
            <Switch.Control label="Output" value="output" />
          </Switch>
          <Switch name="preview-large" size="large">
            <Switch.Control defaultChecked label="Source" value="source" />
            <Switch.Control label="Output" value="output" />
          </Switch>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-medium text-muted-foreground text-sm">Icon</h4>
        <Switch name="preview-icons" size="large">
          <Switch.Control defaultChecked icon={<GridSquare />} label="Grid View" value="grid" />
          <Switch.Control icon={<ListUnordered />} label="List View" value="list" />
        </Switch>
      </section>
    </div>
  );
}
