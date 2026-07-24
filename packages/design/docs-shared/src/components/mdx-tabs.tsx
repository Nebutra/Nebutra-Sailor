"use client";

import {
  Tab as FumaTab,
  Tabs as FumaTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { Children, type ComponentProps, isValidElement, type ReactNode } from "react";

// Mintlify-compat Tab: maps `title` → `value` for fumadocs-ui
export function Tab({
  title,
  value,
  children,
  ...props
}: ComponentProps<typeof FumaTab> & { title?: string }) {
  return (
    <FumaTab value={value ?? title ?? ""} {...props}>
      {children}
    </FumaTab>
  );
}

// Mintlify-compat Tabs: infers `items` from <Tab title="..."> children
export function Tabs({ children, items, ...props }: ComponentProps<typeof FumaTabs>) {
  if (items) {
    return (
      <FumaTabs items={items} {...props}>
        {children}
      </FumaTabs>
    );
  }

  const inferredItems: string[] = [];
  Children.forEach(children as ReactNode, (child) => {
    if (isValidElement(child)) {
      const p = child.props as { title?: string; value?: string };
      const label = p.title ?? p.value ?? "";
      if (label) inferredItems.push(label);
    }
  });

  return (
    <FumaTabs items={inferredItems.length > 0 ? inferredItems : undefined} {...props}>
      {children}
    </FumaTabs>
  );
}

export { TabsContent, TabsList, TabsTrigger };
