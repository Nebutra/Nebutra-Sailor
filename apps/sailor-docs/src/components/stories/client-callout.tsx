"use client";

import { Callout } from "fumadocs-ui/components/callout";
import type { ComponentProps } from "react";

export function ClientCallout(props: ComponentProps<typeof Callout>) {
  return <Callout {...props} />;
}
