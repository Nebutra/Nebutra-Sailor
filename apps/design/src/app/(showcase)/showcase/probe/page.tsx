import { notFound } from "next/navigation";
import { ShowcaseProbe } from "@/components/showcase-probe";
import { liveDemoIds } from "@/lib/showcase";

/**
 * Measuring harness for the showcase grid. Development only: it mounts every
 * demo at once, which is exactly what the real page avoids doing.
 */
export const metadata = { robots: { index: false } };
// Evaluated per request: a prerendered page would bake the dev/prod branch in at build time.
export const dynamic = "force-dynamic";

export default function ProbePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ShowcaseProbe ids={liveDemoIds()} />;
}
