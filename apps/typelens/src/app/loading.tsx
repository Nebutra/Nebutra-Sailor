import { LoadingState } from "@nebutra/ui/layout";

/**
 * Shown while a route segment streams in. LoadingState waits before it
 * appears (the interaction pending delay), so a fast navigation never
 * flashes a spinner, and it keeps its height so nothing shifts when it does.
 */
export default function Loading() {
  return <LoadingState />;
}
