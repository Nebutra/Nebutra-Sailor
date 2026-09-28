import type { ComponentType } from "react";
import { DEMO_LOADERS } from "./demo-loaders.generated";

export { DEMO_LOADERS };

/** Load a demo's component. Each demo is its own chunk. */
export function loadDemo(demoId: string): Promise<ComponentType> {
  const load = DEMO_LOADERS[demoId];
  if (!load) return Promise.reject(new Error(`No catalog demo "${demoId}"`));
  return load();
}
