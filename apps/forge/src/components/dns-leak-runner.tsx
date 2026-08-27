"use client";

/**
 * DNS leak workbench — dual-surface.
 *
 * UX contract:
 *  1) One primary action; advanced probe host is optional.
 *  2) Progress is visible (steps + poll bar + live recursive hits).
 *  3) System-DNS captures are the hero result; DoH/Forge/WebRTC are secondary.
 *  4) Raw JSON lives under <details>, not the default read path.
 */
import { Check, Copy } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShellBadge, type ShellTone, ShellVerdict } from "@/components/journey-shells";
import { invokeForge, MetaCards } from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerPanel } from "@/components/runner-ui";

type ClientProbe = {
  path: string;
  kind: "doh" | "webrtc" | "trace" | "other";
  name?: string;
  answers: string[];
  error?: string;
  ms?: number;
};

type DohEndpoint = {
  path: string;
  label: string;
  url: (name: string) => string;
  parse: (json: unknown) => string[];
};

type AuthorityResolver = {
  ip: string;
  count?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
};

type AuthoritySession = {
  id: string;
  probeNames: string[];
  zone: string;
  resolvers?: AuthorityResolver[];
  ready?: boolean;
  queryCount?: number;
  infrastructure?: boolean;
};

type InfraStatus = "checking" | "online" | "offline";
type PhaseId = "idle" | "session" | "systemDns" | "poll" | "browser" | "server" | "done";

const DOH_TIMEOUT_MS = 3_500;
const POLL_ATTEMPTS = 16;
const POLL_DELAY_MS = 900;
const DOH_ENDPOINTS: readonly DohEndpoint[] = [
  {
    path: "doh-cloudflare",
    label: "Cloudflare",
    url: (name) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A`,
    parse: (json) => {
      const answers = (json as { Answer?: Array<{ type?: number; data?: string }> }).Answer ?? [];
      return answers.filter((a) => a.type === 1 && a.data).map((a) => String(a.data));
    },
  },
  {
    path: "doh-google",
    label: "Google",
    url: (name) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=A`,
    parse: (json) => {
      const answers = (json as { Answer?: Array<{ type?: number; data?: string }> }).Answer ?? [];
      return answers.filter((a) => a.type === 1 && a.data).map((a) => String(a.data));
    },
  },
  {
    path: "doh-alidns",
    label: "AliDNS",
    url: (name) => `https://dns.alidns.com/resolve?name=${encodeURIComponent(name)}&type=A`,
    parse: (json) => {
      const answers = (json as { Answer?: Array<{ type?: number; data?: string }> }).Answer ?? [];
      return answers.filter((a) => a.type === 1 && a.data).map((a) => String(a.data));
    },
  },
];

const STEPS: readonly PhaseId[] = ["session", "systemDns", "poll", "browser", "server"];

async function queryDoh(ep: DohEndpoint, name: string): Promise<ClientProbe> {
  const started = Date.now();
  try {
    const res = await fetch(ep.url(name), {
      headers: { Accept: "application/dns-json" },
      cache: "no-store",
      signal: AbortSignal.timeout(DOH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        path: ep.path,
        kind: "doh",
        name,
        answers: [],
        error: `HTTP ${res.status}`,
        ms: Date.now() - started,
      };
    }
    const json: unknown = await res.json();
    return {
      path: ep.path,
      kind: "doh",
      name,
      answers: ep.parse(json),
      ms: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const timedOut = /abort|timeout/i.test(msg);
    return {
      path: ep.path,
      kind: "doh",
      name,
      answers: [],
      error: timedOut ? `timeout ${DOH_TIMEOUT_MS}ms` : msg,
      ms: Date.now() - started,
    };
  }
}

function extractIpFromCandidate(candidate: string): string | null {
  const v4 = candidate.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
  if (v4?.[1] && v4[1] !== "0.0.0.0") return v4[1];
  const v6 = candidate.match(/\b([a-fA-F0-9:]*:[a-fA-F0-9:]+)\b/);
  if (v6?.[1] && !v6[1].endsWith(":")) return v6[1];
  return null;
}

async function gatherWebrtcIps(timeoutMs = 2_200): Promise<string[]> {
  if (typeof RTCPeerConnection === "undefined") return [];
  const ips = new Set<string>();
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });
  try {
    pc.createDataChannel("forge-dns-leak");
    const done = new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), timeoutMs);
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) {
          clearTimeout(timer);
          resolve();
          return;
        }
        const ip = extractIpFromCandidate(ev.candidate.candidate);
        if (ip) ips.add(ip);
      };
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await done;
  } catch {
    /* ignore */
  } finally {
    pc.close();
  }
  return [...ips];
}

function verdictTone(verdict: string | undefined): ShellTone {
  switch (verdict) {
    case "authority_captured":
    case "consistent":
      return "success";
    case "split_paths":
      return "warning";
    case "ip_mismatch":
      return "danger";
    default:
      return "info";
  }
}

function triggerSystemDns(names: string[]) {
  if (typeof document === "undefined") return;
  const stamp = Date.now();
  for (const name of names) {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = `http://${name}/forge-dns-leak.gif?t=${stamp}`;

    const prefetch = document.createElement("link");
    prefetch.rel = "dns-prefetch";
    prefetch.href = `//${name}`;
    document.head.appendChild(prefetch);

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = `http://${name}`;
    document.head.appendChild(preconnect);

    void fetch(`http://${name}/forge-dns-leak-probe?t=${stamp}`, {
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
    }).catch(() => {
      /* expected */
    });

    window.setTimeout(() => {
      prefetch.remove();
      preconnect.remove();
      img.src = "";
    }, 20_000);
  }
}

async function probeAuthorityHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/dns-leak/sessions", {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return json.ok === true;
  } catch {
    return false;
  }
}

async function createAuthoritySession(): Promise<AuthoritySession | null> {
  try {
    const res = await fetch("/api/v1/dns-leak/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ probeCount: 8, ttlSec: 120 }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthoritySession;
  } catch {
    return null;
  }
}

async function pollAuthoritySession(
  id: string,
  opts: {
    attempts?: number;
    delayMs?: number;
    onTick?: (session: AuthoritySession | null, attempt: number) => void;
  } = {},
): Promise<AuthoritySession | null> {
  const attempts = opts.attempts ?? POLL_ATTEMPTS;
  const delayMs = opts.delayMs ?? POLL_DELAY_MS;
  let last: AuthoritySession | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`/api/v1/dns-leak/sessions/${id}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      if (res.ok) {
        last = (await res.json()) as AuthoritySession;
        opts.onTick?.(last, i + 1);
        if (last.ready && (last.resolvers?.length ?? 0) > 0) return last;
      } else {
        opts.onTick?.(last, i + 1);
      }
    } catch {
      opts.onTick?.(last, i + 1);
    }
    if (last?.probeNames?.length && i > 0 && i % 3 === 0) {
      triggerSystemDns(last.probeNames);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

function stepIndex(phase: PhaseId): number {
  const i = STEPS.indexOf(phase);
  return i < 0 ? (phase === "done" ? STEPS.length : 0) : i;
}

function dohLabel(path: string): string {
  const hit = DOH_ENDPOINTS.find((e) => e.path === path);
  return hit?.label ?? path.replace(/^doh-/, "");
}

export function DnsLeakRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [probeHost, setProbeHost] = useState("cloudflare.com");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<PhaseId>("idle");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error, setError] = useState("");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [localProbes, setLocalProbes] = useState<ClientProbe[]>([]);
  const [localWebrtc, setLocalWebrtc] = useState<string[]>([]);
  const [authority, setAuthority] = useState<AuthoritySession | null>(null);
  const [infraStatus, setInfraStatus] = useState<InfraStatus>("checking");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const online = await probeAuthorityHealth();
      if (!cancelled) setInfraStatus(online ? "online" : "offline");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    setOut(null);
    setAuthority(null);
    setLocalProbes([]);
    setLocalWebrtc([]);
    setPollAttempt(0);
    setCopied(false);
    setPhase("session");
    const host = probeHost.trim() || "cloudflare.com";

    try {
      const authSession = await createAuthoritySession();
      let authResult: AuthoritySession | null = null;

      if (authSession?.probeNames?.length) {
        setInfraStatus("online");
        setAuthority(authSession);
        setPhase("systemDns");
        triggerSystemDns(authSession.probeNames);
        window.setTimeout(() => triggerSystemDns(authSession.probeNames), 350);

        // Parallel: poll authority while browser DoH/WebRTC run — cuts wall-clock wait.
        setPhase("poll");
        const browserPromise = Promise.all([
          Promise.all(DOH_ENDPOINTS.map((ep) => queryDoh(ep, host))),
          gatherWebrtcIps(),
        ]);

        const [polled, browserBundle] = await Promise.all([
          pollAuthoritySession(authSession.id, {
            onTick: (session, attempt) => {
              if (session) setAuthority({ ...session });
              setPollAttempt(attempt);
            },
          }),
          browserPromise,
        ]);

        authResult = polled;
        if (authResult) setAuthority(authResult);
        const [dohResults, webrtcIps] = browserBundle;
        setLocalProbes(dohResults);
        setLocalWebrtc(webrtcIps);
        setPhase("server");

        const r = await invokeForge(toolId, {
          probeHost: host,
          sessionId: authSession.id,
          clientProbes: dohResults,
          webrtcIps,
          authorityResolvers: authResult?.resolvers ?? authSession.resolvers ?? [],
          authorityQueryCount: authResult?.queryCount ?? 0,
          authorityReady: Boolean(authResult?.ready && (authResult.resolvers?.length ?? 0) > 0),
          authorityZone: authSession.zone,
          infrastructureAvailable: true,
        });
        if (!r.ok) {
          setError(r.message);
          return;
        }
        setOut({ ...r.output, authority: authResult ?? authSession });
      } else {
        setInfraStatus("offline");
        setPhase("browser");
        const [dohResults, webrtcIps] = await Promise.all([
          Promise.all(DOH_ENDPOINTS.map((ep) => queryDoh(ep, host))),
          gatherWebrtcIps(),
        ]);
        setLocalProbes(dohResults);
        setLocalWebrtc(webrtcIps);
        setPhase("server");
        const r = await invokeForge(toolId, {
          probeHost: host,
          clientProbes: dohResults,
          webrtcIps,
          infrastructureAvailable: false,
        });
        if (!r.ok) {
          setError(r.message);
          return;
        }
        setOut(r.output);
      }
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  }, [probeHost, toolId]);

  const verdict = typeof out?.verdict === "string" ? out.verdict : undefined;
  const tone = verdictTone(verdict);
  const forgeResolvers = Array.isArray(out?.forgeResolvers)
    ? (out.forgeResolvers as Array<Record<string, unknown>>)
    : [];
  const signals = Array.isArray(out?.signals) ? (out.signals as string[]) : [];
  const honesty =
    out?.honesty && typeof out.honesty === "object"
      ? (out.honesty as { reason?: string; recommendation?: string })
      : null;
  const markers =
    out?.forgeEgressMarkers && typeof out.forgeEgressMarkers === "object"
      ? (out.forgeEgressMarkers as Record<string, unknown>)
      : null;

  const authorityOnline =
    infraStatus === "online" ||
    Boolean((out?.authority as AuthoritySession | undefined)?.infrastructure) ||
    Boolean(authority?.infrastructure) ||
    Boolean(out?.authorityReady);

  const headline =
    verdict === "authority_captured"
      ? t("dnsLeak.verdictAuthority")
      : verdict === "consistent"
        ? t("dnsLeak.verdictConsistent")
        : verdict === "split_paths"
          ? t("dnsLeak.verdictSplit")
          : verdict === "ip_mismatch"
            ? t("dnsLeak.verdictIpMismatch")
            : verdict === "incomplete"
              ? t("dnsLeak.verdictIncomplete")
              : t("dnsLeak.idle");

  const authBlock = (out?.authority as AuthoritySession | undefined) ?? authority ?? null;
  const liveResolvers: AuthorityResolver[] = useMemo(() => {
    const fromAuth = authBlock?.resolvers;
    if (fromAuth && fromAuth.length > 0) return fromAuth;
    const fromOut = (out?.authority as { resolvers?: AuthorityResolver[] } | undefined)?.resolvers;
    return Array.isArray(fromOut) ? fromOut : [];
  }, [authBlock, out]);

  const clientProbes = (
    Array.isArray(out?.clientProbes) ? out.clientProbes : localProbes
  ) as ClientProbe[];
  const webrtcAll = (Array.isArray(out?.webrtcIps) ? out.webrtcIps : localWebrtc) as string[];
  const webrtcPublic = (Array.isArray(out?.webrtcPublic) ? out.webrtcPublic : []) as string[];
  const webrtcPrivate = (Array.isArray(out?.webrtcPrivate) ? out.webrtcPrivate : []) as string[];

  const currentStep = stepIndex(phase);
  const pollPct = Math.min(100, Math.round((pollAttempt / POLL_ATTEMPTS) * 100));

  const SIGNAL_LABELS: Record<string, string> = {
    authority_zone_captured_recursives: t("dnsLeak.sig.captured"),
    authority_zone_online_no_recursive_hits: t("dnsLeak.sig.onlineNoHits"),
    authority_zone_not_ready: t("dnsLeak.sig.offline"),
    forge_resolvers_disagree_on_answers: t("dnsLeak.sig.forgeSplit"),
    browser_doh_paths_disagree_on_answers: t("dnsLeak.sig.dohSplit"),
    webrtc_public_ip_differs_from_edge_ip: t("dnsLeak.sig.webrtcMismatch"),
    webrtc_local_candidates_present: t("dnsLeak.sig.webrtcLocal"),
    no_browser_probes_submitted: t("dnsLeak.sig.noBrowser"),
  };

  const copyResolvers = async () => {
    if (liveResolvers.length === 0) return;
    const text = liveResolvers.map((r) => r.ip).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      /* ignore */
    }
  };

  const stepChipLabel = (id: PhaseId): string => {
    switch (id) {
      case "session":
        return t("dnsLeak.stepSession");
      case "systemDns":
        return t("dnsLeak.stepSystemDns");
      case "poll":
        return t("dnsLeak.stepPoll");
      case "browser":
        return t("dnsLeak.stepBrowser");
      case "server":
        return t("dnsLeak.stepServer");
      default:
        return "";
    }
  };

  const activePhaseLabel = (): string => {
    switch (phase) {
      case "session":
        return t("dnsLeak.phaseSession");
      case "systemDns":
        return t("dnsLeak.phaseSystemDns");
      case "poll":
        return t("dnsLeak.phasePoll", { n: pollAttempt || 1, total: POLL_ATTEMPTS });
      case "browser":
        return t("dnsLeak.phaseBrowser");
      case "server":
        return t("dnsLeak.phaseServer");
      default:
        return "";
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ink"
          size="lg"
          onClick={() => void run()}
          disabled={loading || infraStatus === "checking"}
        >
          {loading ? t("common.running") : out ? t("dnsLeak.retest") : t("dnsLeak.run")}
        </Button>
        {infraStatus === "checking" ? (
          <ShellBadge tone="info">{t("dnsLeak.infraChecking")}</ShellBadge>
        ) : authorityOnline ? (
          <ShellBadge tone="success">{t("dnsLeak.infraOn")}</ShellBadge>
        ) : (
          <ShellBadge tone="warning">{t("dnsLeak.infraOff")}</ShellBadge>
        )}
        <button
          type="button"
          className="text-xs text-[var(--neutral-11)] underline-offset-2 hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? t("dnsLeak.hideAdvanced") : t("dnsLeak.showAdvanced")}
        </button>
      </div>

      {showAdvanced ? (
        <div className="max-w-md space-y-1">
          <Input
            label={t("dnsLeak.probeHost")}
            id="dns-leak-host"
            value={probeHost}
            onChange={(e) => setProbeHost(e.target.value)}
            className="font-mono"
            placeholder="cloudflare.com"
          />
          <RunnerNote>{t("dnsLeak.probeHostHint")}</RunnerNote>
        </div>
      ) : null}

      {/* Progress */}
      {loading ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm font-medium text-[var(--neutral-12)]">{activePhaseLabel()}</p>
          <ol className="flex flex-wrap gap-2">
            {STEPS.map((id, i) => {
              const done = currentStep > i || phase === "done";
              const active = STEPS[currentStep] === id;
              return (
                <li key={id}>
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs",
                      done
                        ? "bg-[color-mix(in_srgb,var(--status-success)_18%,transparent)] text-[var(--status-success)]"
                        : active
                          ? "bg-[var(--neutral-3)] font-medium text-[var(--neutral-12)]"
                          : "bg-[var(--neutral-3)] text-[var(--neutral-10)]",
                    ].join(" ")}
                  >
                    {i + 1}. {stepChipLabel(id)}
                  </span>
                </li>
              );
            })}
          </ol>
          {phase === "poll" ? (
            <div className="space-y-1.5">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-[var(--neutral-4)]"
                role="progressbar"
                aria-valuenow={pollAttempt}
                aria-valuemin={0}
                aria-valuemax={POLL_ATTEMPTS}
              >
                <div
                  className="h-full rounded-full bg-[var(--neutral-11)] transition-[width] duration-300"
                  style={{ width: `${pollPct}%` }}
                />
              </div>
              <p className="text-xs text-[var(--neutral-10)]">
                {t("dnsLeak.pollHint", {
                  n: pollAttempt,
                  total: POLL_ATTEMPTS,
                  hits: authority?.queryCount ?? 0,
                  resolvers: liveResolvers.length,
                })}
              </p>
            </div>
          ) : null}

          {liveResolvers.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--status-success)]">
                {t("dnsLeak.liveHits")}
              </p>
              <ul className="flex flex-wrap gap-2 font-mono text-sm">
                {liveResolvers.map((r) => (
                  <li
                    key={r.ip}
                    className="rounded-md bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] px-2 py-0.5 text-[var(--neutral-12)]"
                  >
                    {r.ip}
                    {typeof r.count === "number" ? (
                      <span className="text-[var(--neutral-11)]"> ×{r.count}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <RunnerError>{error}</RunnerError>

      {/* Results */}
      {out ? (
        <div className="space-y-5">
          <ShellVerdict
            tone={tone}
            headline={headline}
            caveat={honesty?.recommendation ? String(honesty.recommendation) : t("dnsLeak.note")}
          />

          {/* Hero: system DNS recursives */}
          <RunnerPanel>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--neutral-12)]">
                  {t("dnsLeak.sectionSystemDns")}
                </p>
                <p className="text-xs text-[var(--neutral-10)]">{t("dnsLeak.authorityNote")}</p>
              </div>
              {liveResolvers.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyResolvers()}
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5" /> {t("dnsLeak.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> {t("dnsLeak.copyIps")}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
            {liveResolvers.length > 0 ? (
              <ul className="divide-y divide-[var(--neutral-5)] rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
                {liveResolvers.map((r) => (
                  <li
                    key={r.ip}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 font-mono text-sm"
                  >
                    <span className="text-[var(--neutral-12)]">{r.ip}</span>
                    <span className="text-xs text-[var(--neutral-10)]">
                      {typeof r.count === "number" ? t("dnsLeak.queryCount", { n: r.count }) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--neutral-11)]">
                {authorityOnline ? t("dnsLeak.authorityNoHits") : t("dnsLeak.authorityOfflineHint")}
              </p>
            )}
          </RunnerPanel>

          <MetaCards
            items={[
              {
                label: t("dnsLeak.edgeIp"),
                value: String(out.edgeClientIp ?? "—"),
              },
              {
                label: t("dnsLeak.authorityHits"),
                value: String(liveResolvers.length),
              },
              {
                label: t("dnsLeak.dohPaths"),
                value: String(clientProbes.filter((p) => (p.answers?.length ?? 0) > 0).length),
              },
              {
                label: t("dnsLeak.webrtcCount"),
                value: String(webrtcAll.length),
              },
            ]}
          />

          {signals.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {signals.map((s) => (
                <ShellBadge
                  key={s}
                  tone={
                    s.includes("captured")
                      ? "success"
                      : s.includes("not_ready") || s.includes("no_recursive")
                        ? "warning"
                        : "neutral"
                  }
                >
                  {SIGNAL_LABELS[s] ?? s.replaceAll("_", " ")}
                </ShellBadge>
              ))}
            </div>
          ) : null}

          {/* Complementary paths — human tables */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--neutral-12)]">
              {t("dnsLeak.sectionComplementary")}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <RunnerPanel>
                <p className="mb-2 text-xs font-medium text-[var(--neutral-11)]">
                  {t("dnsLeak.forgeResolvers")}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[var(--neutral-10)]">
                      <tr>
                        <th className="pb-1 font-medium">{t("dnsLeak.colPath")}</th>
                        <th className="pb-1 font-medium">{t("dnsLeak.colAnswers")}</th>
                        <th className="pb-1 font-medium">{t("dnsLeak.colMs")}</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[var(--neutral-12)]">
                      {forgeResolvers.map((r) => (
                        <tr
                          key={String(r.resolverId)}
                          className="border-t border-[var(--neutral-5)]"
                        >
                          <td className="py-1.5 pr-2 align-top">{String(r.resolverId ?? "—")}</td>
                          <td className="py-1.5 pr-2 align-top break-all">
                            {Array.isArray(r.answers) && r.answers.length > 0
                              ? (r.answers as string[]).join(", ")
                              : r.error
                                ? String(r.error)
                                : "—"}
                          </td>
                          <td className="py-1.5 align-top tabular-nums">
                            {typeof r.ms === "number" ? r.ms : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-[var(--neutral-10)]">
                  {t("dnsLeak.forgeNote")}
                </p>
              </RunnerPanel>

              <RunnerPanel>
                <p className="mb-2 text-xs font-medium text-[var(--neutral-11)]">
                  {t("dnsLeak.browserDoh")}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[var(--neutral-10)]">
                      <tr>
                        <th className="pb-1 font-medium">{t("dnsLeak.colPath")}</th>
                        <th className="pb-1 font-medium">{t("dnsLeak.colAnswers")}</th>
                        <th className="pb-1 font-medium">{t("dnsLeak.colMs")}</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[var(--neutral-12)]">
                      {clientProbes.map((p) => (
                        <tr key={p.path} className="border-t border-[var(--neutral-5)]">
                          <td className="py-1.5 pr-2 align-top">{dohLabel(p.path)}</td>
                          <td className="py-1.5 pr-2 align-top break-all">
                            {p.answers?.length
                              ? p.answers.join(", ")
                              : p.error
                                ? String(p.error)
                                : "—"}
                          </td>
                          <td className="py-1.5 align-top tabular-nums">
                            {typeof p.ms === "number" ? p.ms : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </RunnerPanel>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RunnerPanel>
                <p className="mb-1 text-xs font-medium text-[var(--neutral-11)]">
                  {t("dnsLeak.webrtc")}
                </p>
                {webrtcAll.length === 0 ? (
                  <p className="text-xs text-[var(--neutral-10)]">—</p>
                ) : (
                  <ul className="space-y-1 font-mono text-xs text-[var(--neutral-12)]">
                    {webrtcAll.map((ip) => (
                      <li key={ip}>
                        {ip}
                        {webrtcPublic.includes(ip) ? (
                          <span className="ml-1 text-[var(--neutral-10)]">
                            ({t("dnsLeak.ipPublic")})
                          </span>
                        ) : webrtcPrivate.includes(ip) ? (
                          <span className="ml-1 text-[var(--neutral-10)]">
                            ({t("dnsLeak.ipPrivate")})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </RunnerPanel>
              <RunnerPanel>
                <p className="mb-1 text-xs font-medium text-[var(--neutral-11)]">
                  {t("dnsLeak.egressMarkers")}
                </p>
                <p className="text-[11px] text-[var(--neutral-10)]">{t("dnsLeak.egressNote")}</p>
                <pre className="mt-2 max-h-36 overflow-auto font-mono text-[11px] text-[var(--neutral-12)]">
                  {JSON.stringify(
                    {
                      opendnsMyIp: markers?.opendnsMyIp ?? null,
                      googleWhoamiTxt: markers?.googleWhoamiTxt ?? null,
                    },
                    null,
                    2,
                  )}
                </pre>
              </RunnerPanel>
            </div>
          </div>

          {honesty?.reason ? (
            <RunnerNote>
              {t("dnsLeak.honestyPrefix")} {String(honesty.reason)}
            </RunnerNote>
          ) : null}

          <details className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3">
            <summary className="cursor-pointer text-xs font-medium text-[var(--neutral-11)]">
              {t("dnsLeak.sectionTech")}
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto font-mono text-[11px] leading-relaxed text-[var(--neutral-12)]">
              {JSON.stringify(
                {
                  sessionId: authBlock?.id ?? null,
                  zone: authBlock?.zone ?? null,
                  ready: authBlock?.ready ?? null,
                  queryCount: authBlock?.queryCount ?? null,
                  probeNames: authBlock?.probeNames ?? [],
                  resolvers: liveResolvers,
                  signals,
                  summary: out.summary ?? null,
                  engine: out.engine ?? null,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      ) : !loading ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-4">
          <p className="text-sm text-[var(--neutral-12)]">
            {infraStatus === "online" ? t("dnsLeak.idleOnline") : t("dnsLeak.idle")}
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-10)]">
            {authorityOnline ? t("dnsLeak.noteOnline") : t("dnsLeak.note")}
          </p>
        </div>
      ) : null}

      {!out && !loading ? (
        <RunnerNote>{authorityOnline ? t("dnsLeak.noteOnline") : t("dnsLeak.note")}</RunnerNote>
      ) : null}
    </div>
  );
}
