"use client";

import {
  MultiSelectContent,
  MultiSelectRoot,
  MultiSelectRow,
  MultiSelectTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";

const items = [
  { id: "design", name: "Design System", description: "Tokens, primitives, docs", count: 42 },
  { id: "components", name: "Components", description: "Reusable interface pieces", count: 28 },
  { id: "tokens", name: "Design Tokens", description: "Semantic variables", count: 15 },
  {
    id: "accessibility",
    name: "Accessibility",
    description: "Focus and screen reader checks",
    count: 11,
  },
] as const;

function triggerLabel(selectedCount: number) {
  if (selectedCount === 0) return "No workstreams selected";
  if (selectedCount === items.length) return "All workstreams selected";
  if (selectedCount === 1) return "1 workstream selected";
  return `${selectedCount} workstreams selected`;
}

export function MultiSelectDemo() {
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(
    () => new Set(["design", "components"]),
  );

  const toggleItem = (id: string) => {
    setSelectedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOnly = (id: string) => setSelectedItems(new Set([id]));
  const selectAll = () => setSelectedItems(new Set(items.map((item) => item.id)));

  return (
    <div className="flex w-full justify-center p-6">
      <div className="flex w-[var(--multi-select-demo-width)] flex-col gap-3 [--multi-select-demo-width:360px]">
        <MultiSelectRoot>
          <MultiSelectTrigger aria-label="Selected workstreams">
            {triggerLabel(selectedItems.size)}
          </MultiSelectTrigger>
          <MultiSelectContent>
            {items.map((item) => (
              <MultiSelectRow
                key={item.id}
                name={item.name}
                description={item.description}
                count={item.count}
                checked={selectedItems.has(item.id)}
                onChange={() => toggleItem(item.id)}
                onSelectOnly={() => selectOnly(item.id)}
                onSelectAll={selectAll}
                selectedCount={selectedItems.size}
                totalCount={items.length}
              />
            ))}
          </MultiSelectContent>
        </MultiSelectRoot>
        <p className="text-sm text-muted-foreground">
          Arrow keys preserve row focus: Up and Down move rows, Left and Right switch controls.
        </p>
      </div>
    </div>
  );
}
