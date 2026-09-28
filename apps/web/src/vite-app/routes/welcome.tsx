import { useAuthContext } from "@nebutra/auth/react/context";
import { BrandMark, BrandWordmark } from "@nebutra/brand";
import {
  Analytics,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Cache,
  Check,
  CloudUpload,
  Copy,
  CreditCard,
  Database,
  Envelope,
  Fingerprint,
  Hook,
  type Icon,
  Key,
  Layers,
  Message,
  Monitoring,
  PencilEdit,
  Puzzle,
  ShieldCheck,
  Sparkles,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button, Card } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { createRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_ACCOUNT, hasDemoAccount, signInWithDemoAccount } from "@/vite-app/preview-auth";
import { rootRoute } from "./__root";

/**
 * /welcome — the first screen of a fresh project.
 *
 * Reachable signed in or out. Says the product is running, signs in with the
 * preview database's demo account in one click, shows what each capability
 * runs on right now (the rows `nebutra status` prints, handed over by
 * `pnpm dev` in VITE_SAILOR_CAPABILITIES) and the three things to do next.
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

const CAPABILITY_META: Record<string, { label: string; icon: Icon }> = {
  auth: { label: "Authentication", icon: Fingerprint },
  billing: { label: "Billing", icon: CreditCard },
  email: { label: "Email", icon: Envelope },
  sms: { label: "SMS", icon: Message },
  storage: { label: "File storage", icon: CloudUpload },
  queue: { label: "Background jobs", icon: Layers },
  cache: { label: "Cache", icon: Cache },
  notifications: { label: "Notifications", icon: Bell },
  webhooks: { label: "Webhooks", icon: Hook },
  ai: { label: "AI", icon: Sparkles },
  mcp: { label: "MCP server", icon: Puzzle },
  monitoring: { label: "Error monitoring", icon: Monitoring },
  analytics: { label: "Product analytics", icon: Analytics },
  captcha: { label: "Bot protection", icon: ShieldCheck },
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
  direct: "built-in delivery",
  custom: "built-in signing",
  "built-in": "the built-in server",
  memory: "in memory",
  console: "to the console",
  local: "on local disk",
  dev: "the dev provider",
};

const providerList = (ids: string[]) => ids.map((id) => PROVIDER_LABEL[id] ?? id).join(", ");

function describeRow(row: CapabilityRow): string {
  if (row.state === "live") return `Running on ${providerList(row.provider)}`;
  if (row.state === "local-fallback") return `Running locally, ${providerList(row.provider)}`;
  return "Switches on when its key is set";
}

const STATE_STYLE: Record<CapabilityState, { dot: string; label: string }> = {
  live: { dot: "bg-success", label: "Live" },
  "local-fallback": { dot: "bg-neutral-9", label: "Running locally" },
  "missing-key": { dot: "bg-warning", label: "Needs a key" },
};

function StateDot({ state, className }: { state: CapabilityState; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", STATE_STYLE[state].dot, className)}
    />
  );
}

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

function EnvChip({ name }: { name: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button
      type="button"
      variant="outline"
      size="tiny"
      className="font-mono"
      aria-label={`Copy ${name}`}
      onClick={() => void copy(name)}
      suffix={copied ? <Check className="text-success-strong" /> : <Copy />}
    >
      {name}
    </Button>
  );
}

function CapabilityCard({ row }: { row: CapabilityRow }) {
  const meta = CAPABILITY_META[row.name] ?? { label: row.name, icon: Puzzle };
  const IconComponent = meta.icon;
  return (
    <Card padding="md" className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-neutral-3 text-neutral-12">
          <IconComponent size={16} />
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-11">
          <StateDot state={row.state} />
          {STATE_STYLE[row.state].label}
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-neutral-12">{meta.label}</h3>
        <p className="text-sm text-neutral-11">{describeRow(row)}</p>
      </div>
      {row.state === "missing-key" && row.missing.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-1.5">
          {row.missing.map((name) => (
            <EnvChip key={name} name={name} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function CommandSnippet({ command }: { command: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-between bg-neutral-2 font-mono text-sm"
      aria-label={`Copy ${command}`}
      onClick={() => void copy(command)}
      suffix={copied ? <Check className="text-success-strong" /> : <Copy />}
    >
      <span className="min-w-0 truncate text-left">
        <span className="text-neutral-10">$ </span>
        {command}
      </span>
    </Button>
  );
}

const NEXT_STEPS: ReadonlyArray<{ icon: Icon; title: string; body: string; command: string }> = [
  {
    icon: PencilEdit,
    title: "Make it yours",
    body: "brand.config.ts already carries the project's name. Change the name, colours or logo there, then apply it everywhere.",
    command: "pnpm brand:apply",
  },
  {
    icon: Key,
    title: "Take a capability live",
    body: "Add the keys a capability needs to .env.local, restart the preview, and check what went live.",
    command: "nebutra status",
  },
  {
    icon: Database,
    title: "Bring your own Postgres",
    body: "The preview keeps its data in a local PGlite database. Point DATABASE_URL at Postgres to switch.",
    command: "pnpm db:migrate",
  },
];

function Hero({ keysNeeded }: { keysNeeded: number }) {
  const { isSignedIn, user } = useAuthContext();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demo = hasDemoAccount();
  const host = typeof window === "undefined" ? "localhost" : window.location.host;

  const demoSignIn = async () => {
    setPending(true);
    setError(null);
    const failure = await signInWithDemoAccount();
    setPending(false);
    // A full load lets the session provider read the new cookie.
    if (failure) setError(failure);
    else window.location.assign("/welcome");
  };

  return (
    <AnimateIn preset="emerge">
      <section className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <BrandMark size={36} />
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-neutral-6 bg-neutral-2 px-3 py-1 text-xs text-neutral-11">
            <span className="relative flex size-2">
              <span className="absolute -inset-1 rounded-full bg-success opacity-25" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            <span>Preview on {host}</span>
            <span aria-hidden="true">·</span>
            <span>{demo ? "local database" : "your database"}</span>
            <span aria-hidden="true">·</span>
            <span>
              {keysNeeded === 0
                ? "no keys needed"
                : `${keysNeeded} ${keysNeeded === 1 ? "capability needs" : "capabilities need"} a key`}
            </span>
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-neutral-12 md:text-6xl">
            <BrandWordmark inline className="mr-[0.25em]" />
            <span className="text-neutral-10">is running locally</span>
          </h1>
          <p className="max-w-2xl text-lg text-neutral-11">
            The product app, the site and the API are up on this machine. Every capability runs
            without a key; add one when you want the real provider.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
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
              <Button asChild size="lg" variant="outline">
                <a href="/sign-in?mode=sign-up">Create an account</a>
              </Button>
            )}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive-strong">
              {error}
            </p>
          ) : (
            <p className="text-sm text-neutral-10">
              {isSignedIn
                ? `Signed in as ${user?.email ?? user?.name ?? "you"}.`
                : demo
                  ? `Demo account ${DEMO_ACCOUNT.email} · ${DEMO_ACCOUNT.password}`
                  : "Accounts live in this project's own database."}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {import.meta.env.VITE_SAILOR_SITE_URL ? (
            <Button asChild variant="ghost" size="sm">
              <a href={import.meta.env.VITE_SAILOR_SITE_URL}>
                Marketing site
                <ArrowUpRight />
              </a>
            </Button>
          ) : null}
          {import.meta.env.VITE_SAILOR_API_URL ? (
            <Button asChild variant="ghost" size="sm">
              <a href={`${import.meta.env.VITE_SAILOR_API_URL}/docs`}>
                API reference
                <ArrowUpRight />
              </a>
            </Button>
          ) : null}
        </div>
      </section>
    </AnimateIn>
  );
}

function Capabilities({ rows }: { rows: CapabilityRow[] | null }) {
  const running = rows?.filter((row) => row.state !== "missing-key").length ?? 0;
  const needKey = (rows?.length ?? 0) - running;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-12">Capabilities</h2>
          <p className="text-sm text-neutral-11">What each one runs on right now.</p>
        </div>
        {rows ? (
          <p className="flex items-center gap-4 text-sm text-neutral-11">
            <span className="inline-flex items-center gap-1.5">
              <StateDot state="live" />
              {running} running
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StateDot state="missing-key" />
              {needKey} {needKey === 1 ? "needs a key" : "need a key"}
            </span>
          </p>
        ) : null}
      </div>
      {rows ? (
        <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {rows.map((row) => (
            <AnimateIn key={row.name} preset="fadeUp" className="h-full">
              <CapabilityCard row={row} />
            </AnimateIn>
          ))}
        </AnimateInGroup>
      ) : (
        <Card padding="md" className="text-sm text-neutral-11">
          Start the preview with <code className="font-mono">pnpm dev</code> from the project root
          to see each capability here, or run <code className="font-mono">nebutra status</code>.
        </Card>
      )}
    </section>
  );
}

function NextSteps() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-12">Next steps</h2>
        <p className="text-sm text-neutral-11">From this preview to your own product.</p>
      </div>
      <AnimateInGroup stagger="normal" className="grid gap-4 md:grid-cols-3">
        {NEXT_STEPS.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <AnimateIn key={step.title} preset="fadeUp" className="h-full">
              <Card padding="lg" className="flex h-full flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-neutral-3 text-neutral-12">
                    <IconComponent size={18} />
                  </span>
                  <span className="font-mono text-xs text-neutral-10">0{index + 1}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-neutral-12">{step.title}</h3>
                  <p className="text-sm text-neutral-11">{step.body}</p>
                </div>
                <div className="mt-auto">
                  <CommandSnippet command={step.command} />
                </div>
              </Card>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </section>
  );
}

function WelcomeRoute() {
  const capabilities = readCapabilities();
  const keysNeeded = capabilities?.filter((row) => row.state === "missing-key").length ?? 0;
  return (
    <div className="mx-auto w-full max-w-content space-y-20 px-4 py-12 md:px-6 md:py-20">
      <Hero keysNeeded={keysNeeded} />
      <Capabilities rows={capabilities} />
      <NextSteps />
      <p className="text-center text-xs text-neutral-10">
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
