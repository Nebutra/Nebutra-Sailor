import { useAuthContext } from "@nebutra/auth/react/context";
import { BrandMark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { ArrowRight, ArrowUpRight, Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { createRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionScopeChanged } from "@/vite-app/auth-provider";
import { DEMO_ACCOUNT, hasDemoAccount, signInWithDemoAccount } from "@/vite-app/preview-auth";
import { rootRoute } from "./__root";

/**
 * /welcome — the first screen of a fresh project.
 *
 * Reachable signed in or out. Says the product is running, signs in with the
 * preview database's demo account in one click, shows what each capability
 * runs on right now (the rows `nebutra status` prints, handed over by
 * `pnpm dev` in VITE_SAILOR_CAPABILITIES) and the three things to do next.
 *
 * One column, one weight of emphasis per block: a sentence, a table, a list.
 * The capability table reads like `nebutra status` because that is what it is.
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

const CAPABILITY_LABEL: Record<string, string> = {
  auth: "Authentication",
  billing: "Billing",
  email: "Email",
  sms: "SMS",
  storage: "File storage",
  queue: "Background jobs",
  cache: "Cache",
  notifications: "Notifications",
  webhooks: "Webhooks",
  ai: "AI",
  mcp: "MCP server",
  monitoring: "Error monitoring",
  analytics: "Product analytics",
  captcha: "Bot protection",
};

const PROVIDER_LABEL: Record<string, string> = {
  "better-auth": "Better Auth",
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  bailian: "Bailian",
  creem: "Creem",
  "wechat-pay": "WeChat Pay",
  alipay: "Alipay",
  resend: "Resend",
  qstash: "QStash",
  redis: "Redis",
  "s3-compatible": "S3-compatible storage",
  sentry: "Sentry",
  posthog: "PostHog",
  turnstile: "Turnstile",
  "twilio-verify": "Twilio Verify",
  aliyun: "Aliyun SMS",
  direct: "Built-in delivery",
  custom: "Built-in signing",
  "built-in": "Built-in server",
  memory: "In memory",
  console: "Printed to the console",
  local: "Local disk",
  dev: "Dev provider",
};

const providerList = (ids: string[]) => ids.map((id) => PROVIDER_LABEL[id] ?? id).join(", ");

const STATE_STYLE: Record<CapabilityState, { dot: string; label: string }> = {
  live: { dot: "bg-success", label: "Live" },
  "local-fallback": { dot: "bg-neutral-8", label: "Local" },
  "missing-key": { dot: "bg-warning", label: "Needs a key" },
};

/** Copy to the clipboard; `copied` is the value last copied, for a moment. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1600);
  }, []);
  return { copied, copy };
}

/** A value to paste somewhere else: an env name or a command. */
function CopyChip({ value, prompt = false }: { value: string; prompt?: boolean }) {
  const { copied, copy } = useCopy();
  return (
    <Button
      type="button"
      variant="outline"
      size="tiny"
      className="font-mono"
      aria-label={`Copy ${value}`}
      onClick={() => void copy(value)}
      suffix={copied ? <Check className="text-success-strong" /> : <Copy />}
    >
      {prompt ? <span className="text-neutral-10">$</span> : null}
      {value}
    </Button>
  );
}

function SectionHead({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-4">
      <h2 className="text-base font-medium text-neutral-12">{title}</h2>
      {aside ? <div className="text-sm text-neutral-10">{aside}</div> : null}
    </div>
  );
}

function Hero({ keysNeeded }: { keysNeeded: number }) {
  const { isSignedIn, user } = useAuthContext();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionScopeChanged = useSessionScopeChanged();
  const demo = hasDemoAccount();
  const host = typeof window === "undefined" ? "localhost" : window.location.host;

  const demoSignIn = async () => {
    setPending(true);
    setError(null);
    const failure = await signInWithDemoAccount();
    setPending(false);
    // The session is read in place: the hero re-renders signed in.
    if (failure) setError(failure);
    else await sessionScopeChanged();
  };

  const siteUrl = import.meta.env.VITE_SAILOR_SITE_URL;
  const apiUrl = import.meta.env.VITE_SAILOR_API_URL;
  const link =
    "inline-flex items-center gap-1 text-neutral-11 transition-colors hover:text-neutral-12";

  return (
    <section>
      <BrandMark size={28} />
      <h1 className="mt-10 text-4xl font-semibold tracking-tight text-neutral-12 md:text-5xl">
        {brand.name} is running.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-neutral-11">
        The product app, the site and the API are up on {host}, on{" "}
        {demo ? "a local database" : "your database"}.{" "}
        {keysNeeded === 0
          ? "Every capability is live."
          : "Everything works without keys; add one when you want the real provider."}
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        {isSignedIn ? (
          <Button asChild size="lg">
            <Link to="/settings" search={{ tab: "profile" }}>
              Open your workspace
              <ArrowRight />
            </Link>
          </Button>
        ) : demo ? (
          <Button
            type="button"
            size="lg"
            disabled={pending}
            onClick={() => void demoSignIn()}
            suffix={<ArrowRight />}
          >
            Sign in with the demo account
          </Button>
        ) : (
          <Button asChild size="lg">
            <a href="/sign-in">
              Sign in
              <ArrowRight />
            </a>
          </Button>
        )}
        {isSignedIn ? null : (
          <Button asChild size="lg" variant="ghost">
            <a href="/sign-in?mode=sign-up">Create an account</a>
          </Button>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive-strong">
          {error}
        </p>
      ) : (
        <p className="mt-4 text-sm text-neutral-10">
          {isSignedIn ? (
            `Signed in as ${user?.email ?? user?.name ?? "you"}.`
          ) : demo ? (
            <span className="font-mono">
              {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
            </span>
          ) : (
            "Accounts live in this project's own database."
          )}
        </p>
      )}

      {siteUrl || apiUrl ? (
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {siteUrl ? (
            <a href={siteUrl} className={link}>
              Marketing site
              <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
          {apiUrl ? (
            <a href={`${apiUrl}/docs`} className={link}>
              API reference
              <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

function CapabilityTableRow({ row }: { row: CapabilityRow }) {
  const style = STATE_STYLE[row.state];
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)_7rem] sm:items-center">
      <span className="text-sm text-neutral-12">{CAPABILITY_LABEL[row.name] ?? row.name}</span>
      <span className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
        {row.state === "missing-key" && row.missing.length > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {row.missing.map((name) => (
              <CopyChip key={name} value={name} />
            ))}
          </span>
        ) : (
          <span className="text-sm text-neutral-11">{providerList(row.provider)}</span>
        )}
      </span>
      <span className="col-start-2 row-start-1 inline-flex items-center justify-end gap-2 text-xs text-neutral-11 sm:col-start-auto sm:row-start-auto">
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", style.dot)} />
        {style.label}
      </span>
    </li>
  );
}

function Capabilities({ rows }: { rows: CapabilityRow[] | null }) {
  const live = rows?.filter((row) => row.state === "live").length ?? 0;
  const local = rows?.filter((row) => row.state === "local-fallback").length ?? 0;
  const needKey = rows?.filter((row) => row.state === "missing-key").length ?? 0;

  return (
    <section>
      <SectionHead
        title="Capabilities"
        aside={rows ? `${live} live · ${local} local · ${needKey} need a key` : undefined}
      />
      {rows ? (
        <ul className="divide-y divide-neutral-5 border-y border-neutral-5">
          {rows.map((row) => (
            <CapabilityTableRow key={row.name} row={row} />
          ))}
        </ul>
      ) : (
        <p className="border-y border-neutral-5 py-4 text-sm text-neutral-11">
          Start the preview with <code className="font-mono">pnpm dev</code> from the project root
          to see each capability here, or run <code className="font-mono">nebutra status</code>.
        </p>
      )}
    </section>
  );
}

const NEXT_STEPS: ReadonlyArray<{ title: string; body: string; command: string }> = [
  {
    title: "Make it yours",
    body: "brand.config.ts already carries the project's name. Change the name, colours or logo there, then apply it everywhere.",
    command: "pnpm brand:apply",
  },
  {
    title: "Take a capability live",
    body: "Add the keys a capability needs to .env.local, restart the preview, and check what went live.",
    command: "nebutra status",
  },
  {
    title: "Bring your own Postgres",
    body: "The preview keeps its data in a local PGlite database. Point DATABASE_URL at Postgres to switch.",
    command: "pnpm db:migrate",
  },
];

function NextSteps() {
  return (
    <section>
      <SectionHead title="Next steps" />
      <ol className="divide-y divide-neutral-5 border-y border-neutral-5">
        {NEXT_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 py-5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-start"
          >
            <span className="font-mono text-sm text-neutral-10">{index + 1}</span>
            <div>
              <h3 className="text-sm font-medium text-neutral-12">{step.title}</h3>
              <p className="mt-1 max-w-xl text-sm text-neutral-11">{step.body}</p>
            </div>
            <div className="col-start-2 mt-3 sm:col-start-auto sm:mt-0">
              <CopyChip value={step.command} prompt />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WelcomeRoute() {
  const capabilities = readCapabilities();
  const keysNeeded = capabilities?.filter((row) => row.state === "missing-key").length ?? 0;
  return (
    <div className="mx-auto w-full max-w-text space-y-20 px-4 py-16 md:px-6 md:py-24">
      <Hero keysNeeded={keysNeeded} />
      <Capabilities rows={capabilities} />
      <NextSteps />
      <p className="text-xs text-neutral-10">
        This page is <code className="font-mono">apps/web/src/vite-app/routes/welcome.tsx</code>.
        Delete it once you have a home page of your own.
      </p>
    </div>
  );
}

export const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome",
  component: WelcomeRoute,
});
