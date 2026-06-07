import { isStartupOSPrototypeEnabled } from "@nebutra/startup-os/feature-flag";
import { createRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { getVitePublicEnv } from "@/vite-app/app-env";
import { rootRoute } from "./__root";

const StartupCommandCenter = lazy(() =>
  import("@/components/startup-os/startup-command-center").then((module) => ({
    default: module.StartupCommandCenter,
  })),
);

function StartupOSRoute() {
  if (!isStartupOSPrototypeEnabled(getVitePublicEnv())) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
        <h1 className="text-xl font-semibold">Startup OS is not enabled</h1>
        <p className="mt-2 text-sm text-neutral-11">
          Enable the prototype flag in the Product App environment to load this workspace.
        </p>
      </section>
    );
  }

  return (
    <Suspense
      fallback={
        <section className="rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
          <p className="text-sm text-neutral-11">Loading Startup OS...</p>
        </section>
      }
    >
      <StartupCommandCenter />
    </Suspense>
  );
}

export const startupOsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/startup-os",
  component: StartupOSRoute,
});
