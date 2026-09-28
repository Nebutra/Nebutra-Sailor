import { useAuthContext } from "@nebutra/auth/react/context";
import { brand } from "@nebutra/brand/metadata";
import { Badge, Button } from "@nebutra/ui/primitives";
import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";

/**
 * /welcome — the first page of a fresh project.
 *
 * Reachable signed in or out. Shows where the preview is running, what each
 * capability runs on right now (the rows `nebutra status` prints, handed over
 * by `pnpm dev` in VITE_SAILOR_CAPABILITIES) and what to do next.
 */

type CapabilityState = "live" | "local-fallback" | "missing-key";

interface CapabilityRow {
  name: string;
  state: CapabilityState;
  provider: string[];
  missing: string[];
  next: string;
}

function readCapabilities(): CapabilityRow[] | null {
  const raw = import.meta.env.VITE_SAILOR_CAPABILITIES;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CapabilityRow[]) : null;
  } catch {
    return null;
  }
}

const STATE_LABEL: Record<CapabilityState, string> = {
  live: "Live",
  "local-fallback": "Local fallback",
  "missing-key": "Needs a key",
};

const STATE_VARIANT: Record<CapabilityState, "success" | "secondary" | "warning"> = {
  live: "success",
  "local-fallback": "secondary",
  "missing-key": "warning",
};

function CapabilityTable({ rows }: { rows: CapabilityRow[] }) {
  return (
    <ul className="divide-y divide-neutral-6 rounded-[var(--radius-lg)] border border-neutral-7">
      {rows.map((row) => (
        <li key={row.name} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium capitalize">{row.name}</p>
            <p className="mt-0.5 text-xs text-neutral-11">
              {row.state === "live"
                ? `Running on ${row.provider.join(", ")}`
                : row.state === "local-fallback"
                  ? `Running locally (${row.provider.join(", ")}). ${row.next}`
                  : row.next}
            </p>
          </div>
          <Badge variant={STATE_VARIANT[row.state]} className="shrink-0">
            {STATE_LABEL[row.state]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

const NEXT_STEPS = [
  {
    title: "Make it yours",
    body: "Generate brand.config.ts, edit the name and colours, then apply it everywhere.",
    command: "pnpm brand:init && pnpm brand:apply",
  },
  {
    title: "Take a capability live",
    body: "Copy a provider key from .env.example into .env.local and restart pnpm dev.",
    command: ".env.local",
  },
  {
    title: "Use your own Postgres",
    body: "The preview keeps its data in a local PGlite database under .nebutra/. Point DATABASE_URL at your Postgres to switch.",
    command: "pnpm db:migrate",
  },
] as const;

function WelcomeRoute() {
  const { isSignedIn, user } = useAuthContext();
  const capabilities = readCapabilities();
  const siteUrl = import.meta.env.VITE_SAILOR_SITE_URL;
  const apiUrl = import.meta.env.VITE_SAILOR_API_URL;

  return (
    <div className="mx-auto w-full max-w-text space-y-10 px-4 py-10">
      <header className="space-y-3">
        <p className="text-sm text-neutral-11">Local preview</p>
        <h1 className="text-3xl font-semibold tracking-tight">{brand.name} is running</h1>
        <p className="text-neutral-11">
          Every capability runs on this machine without keys. Add a key when you want the real
          provider; the list below shows what each one runs on right now.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {isSignedIn ? (
            <Button asChild>
              <Link to="/settings" search={{ tab: "profile" }}>
                Open your workspace
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <a href="/sign-in">Sign in or create an account</a>
            </Button>
          )}
          {siteUrl ? (
            <Button asChild variant="outline">
              <a href={siteUrl}>Open the site</a>
            </Button>
          ) : null}
          {apiUrl ? (
            <Button asChild variant="outline">
              <a href={`${apiUrl}/docs`}>API reference</a>
            </Button>
          ) : null}
        </div>
        {isSignedIn ? (
          <p className="text-sm text-neutral-11">Signed in as {user?.email ?? user?.name}.</p>
        ) : import.meta.env.VITE_SAILOR_DEMO_ACCOUNT ? (
          <p className="text-sm text-neutral-11">
            The local database has a demo account: admin@example.com / nebutra-preview.
          </p>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Capabilities</h2>
        {capabilities ? (
          <CapabilityTable rows={capabilities} />
        ) : (
          <p className="text-sm text-neutral-11">
            Start the preview with <code>pnpm dev</code> from the project root to see readiness
            here, or run <code>nebutra status</code>.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Next steps</h2>
        <ol className="space-y-4">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {index + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-neutral-11">{step.body}</p>
                <code className="inline-block rounded bg-neutral-3 px-2 py-0.5 text-xs">
                  {step.command}
                </code>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-neutral-7 border-t pt-6 text-xs text-neutral-11">
        This page lives at <code>apps/web/src/vite-app/routes/welcome.tsx</code>; delete it once you
        have your own home page.
      </footer>
    </div>
  );
}

export const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome",
  component: WelcomeRoute,
});
