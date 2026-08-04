"use client";

/**
 * DNS leak workbench — dual-surface.
 *
 * Browser: DoH multi-path + WebRTC ICE candidates + system-DNS probes against
 * the authoritative leak zone (when online).
 * Server: multi-resolver A probes + egress whoami markers + edge IP.
 *
 * Hard-correct: full OS-system DNS leak maps require the authority zone to
 * observe recursive queries; we never invent Geo/ASN.
 */
import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ShellBadge, type ShellTone, ShellVerdict } from "@/components/journey-shells";
import { invokeForge, MetaCards } from "@/components/result-panels";
import { RunnerError, RunnerNote } from "@/components/runner-ui";

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
  /** Build absolute DoH URL for a DNS name (A). */
  url: (name: string) => string;
  parse: (json: unknown) => string[];
};

const DOH_TIMEOUT_MS = 3_500;
const DOH_ENDPOINTS: readonly DohEndpoint[] = [
  {
    path: "doh-cloudflare",
    label: "Cloudflare DoH",
    url: (name) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A`,
    parse: (json) => {
      const answers = (json as { Answer?: Array<{ type?: number; data?: string }> }).Answer ?? [];
      return answers.filter((a) => a.type === 1 && a.data).map((a) => String(a.data));
    },
  },
  {
    path: "doh-google",
    label: "Google DoH",
    url: (name) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=A`,
    parse: (json) => {
      const answers = (json as { Answer?: Array<{ type?: number; data?: string }> }).Answer ?? [];
      return answers.filter((a) => a.type === 1 && a.data).map((a) => String(a.data));
    },
  },
  {
    path: "doh-alidns",
    label: "AliDNS DoH",
    url: (name) => `https://dns.alidns.com/resolve?name=${encodeURIComponent(name)}&type=A`,
    parse: (json) => {
      const answers = (json as { Answer?: Array<{ type?: number; data?: string }> }).Answer ?? [];
      return answers.filter((a) => a.type === 1 && a.data).map((a) => String(a.data));
    },
  },
];

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

async function gatherWebrtcIps(timeoutMs = 2_500): Promise<string[]> {
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
    /* ignore WebRTC failures */
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

type AuthoritySession = {
  id: string;
  probeNames: string[];
  zone: string;
  resolvers?: Array<{ ip: string; count: number; firstSeenAt: string; lastSeenAt: string }>;
  ready?: boolean;
  queryCount?: number;
  infrastructure?: boolean;
};

type InfraStatus = "checking" | "online" | "offline";

/**
 * Force browser *system* DNS (not app-level DoH) via speculative resources the
 * OS resolver must look up. Connection failures are expected and fine.
 */
function triggerSystemDns(names: string[]) {
  if (typeof document === "undefined") return;
  const stamp = Date.now();
  for (const name of names) {
    // 1) Classic image probe (http forces a real lookup)
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = `http://${name}/forge-dns-leak.gif?t=${stamp}`;

    // 2) dns-prefetch / preconnect hints
    const prefetch = document.createElement("link");
    prefetch.rel = "dns-prefetch";
    prefetch.href = `//${name}`;
    document.head.appendChild(prefetch);

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = `http://${name}`;
    document.head.appendChild(preconnect);

    // 3) no-cors fetch — some browsers resolve even when mixed content blocks images
    void fetch(`http://${name}/forge-dns-leak-probe?t=${stamp}`, {
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
    }).catch(() => {
      /* expected network / mixed-content failure */
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
  const attempts = opts.attempts ?? 18; // ~18s with 1s delay
  const delayMs = opts.delayMs ?? 1_000;
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
    // Re-fire system DNS mid-poll — resolvers are often lazy / cached cold path
    if (last?.probeNames?.length && i > 0 && i % 3 === 0) {
      triggerSystemDns(last.probeNames);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

export function DnsLeakRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [probeHost, setProbeHost] = useState("cloudflare.com");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [localProbes, setLocalProbes] = useState<ClientProbe[]>([]);
  const [localWebrtc, setLocalWebrtc] = useState<string[]>([]);
  const [authority, setAuthority] = useState<AuthoritySession | null>(null);
  const [infraStatus, setInfraStatus] = useState<InfraStatus>("checking");

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
    setPhase(t("dnsLeak.phaseSession"));
    const host = probeHost.trim() || "cloudflare.com";

    try {
      // 1) Prefer real infrastructure: unique names → system DNS → auth zone logs recursives
      const authSession = await createAuthoritySession();
      let authResult: AuthoritySession | null = null;
      if (authSession?.probeNames?.length) {
        setInfraStatus("online");
        setAuthority(authSession);
        setPhase(t("dnsLeak.phaseSystemDns"));
        triggerSystemDns(authSession.probeNames);
        // Second wave after a short settle — helps flaky resolvers
        window.setTimeout(() => triggerSystemDns(authSession.probeNames), 400);
        authResult = await pollAuthoritySession(authSession.id, {
          onTick: (session, attempt) => {
            if (session) setAuthority(session);
            setPhase(t("dnsLeak.phasePoll", { n: attempt }));
          },
        });
        if (authResult) setAuthority(authResult);
      } else {
        setInfraStatus("offline");
      }

      // 2) Always collect DoH + WebRTC + multi-resolver (complements authority mode)
      setPhase(t("dnsLeak.phaseBrowser"));
      const [dohResults, webrtcIps] = await Promise.all([
        Promise.all(DOH_ENDPOINTS.map((ep) => queryDoh(ep, host))),
        gatherWebrtcIps(),
      ]);
      setLocalProbes(dohResults);
      setLocalWebrtc(webrtcIps);

      setPhase(t("dnsLeak.phaseServer"));
      const r = await invokeForge(toolId, {
        probeHost: host,
        sessionId: authSession?.id ?? authResult?.id,
        clientProbes: dohResults,
        webrtcIps,
        authorityResolvers: authResult?.resolvers ?? authSession?.resolvers ?? [],
        authorityQueryCount: authResult?.queryCount ?? 0,
        authorityReady: Boolean(authResult?.ready && (authResult.resolvers?.length ?? 0) > 0),
        authorityZone: authSession?.zone ?? authResult?.zone,
        infrastructureAvailable: Boolean(authSession?.infrastructure ?? authSession?.id),
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setOut({
        ...r.output,
        authority: authResult ?? authSession,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase("");
      setLoading(false);
    }
  }, [probeHost, toolId, t]);

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
  const authResolvers = authBlock?.resolvers;
  const outAuthResolvers = (
    out?.authority as { resolvers?: Array<{ ip: string; count?: number }> } | undefined
  )?.resolvers;
  const capturedResolvers =
    authResolvers && authResolvers.length > 0
      ? authResolvers
      : Array.isArray(outAuthResolvers)
        ? outAuthResolvers
        : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label={t("dnsLeak.probeHost")}
          id="dns-leak-host"
          value={probeHost}
          onChange={(e) => setProbeHost(e.target.value)}
          className="min-w-[16rem] font-mono"
          placeholder="cloudflare.com"
        />
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? t("common.running") : t("dnsLeak.run")}
        </Button>
        {infraStatus === "checking" ? (
          <ShellBadge tone="info">{t("dnsLeak.infraChecking")}</ShellBadge>
        ) : authorityOnline ? (
          <ShellBadge tone="success">{t("dnsLeak.infraOn")}</ShellBadge>
        ) : (
          <ShellBadge tone="warning">{t("dnsLeak.infraOff")}</ShellBadge>
        )}
      </div>

      {loading && phase ? <RunnerNote>{phase}</RunnerNote> : null}

      <RunnerError>{error}</RunnerError>

      {out ? (
        <div className="space-y-4">
          <ShellVerdict
            tone={tone}
            headline={headline}
            caveat={honesty?.recommendation ? String(honesty.recommendation) : t("dnsLeak.note")}
          />

          {capturedResolvers.length > 0 ? (
            <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-4">
              <p className="text-sm font-medium text-[var(--neutral-12)]">
                {t("dnsLeak.authorityResolvers")}
              </p>
              <ul className="space-y-1 font-mono text-sm text-[var(--neutral-12)]">
                {capturedResolvers.map((r) => (
                  <li key={r.ip}>
                    {r.ip}
                    {typeof r.count === "number" ? (
                      <span className="text-[var(--neutral-11)]"> ×{r.count}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <RunnerNote>{t("dnsLeak.authorityNote")}</RunnerNote>
            </div>
          ) : authorityOnline ? (
            <RunnerNote>{t("dnsLeak.authorityNoHits")}</RunnerNote>
          ) : null}

          <MetaCards
            items={[
              {
                label: t("dnsLeak.edgeIp"),
                value: String(out.edgeClientIp ?? "—"),
              },
              {
                label: t("dnsLeak.forgePaths"),
                value: String(
                  (out.summary as { forgePathsWithAnswers?: number } | undefined)
                    ?.forgePathsWithAnswers ?? forgeResolvers.length,
                ),
              },
              {
                label: t("dnsLeak.dohPaths"),
                value: String(
                  (out.summary as { browserDohPaths?: number } | undefined)?.browserDohPaths ??
                    localProbes.filter((p) => p.answers.length > 0).length,
                ),
              },
              {
                label: t("dnsLeak.webrtcCount"),
                value: String(
                  localWebrtc.length || (Array.isArray(out.webrtcIps) ? out.webrtcIps.length : 0),
                ),
              },
            ]}
          />

          {signals.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {signals.map((s) => (
                <ShellBadge key={s} tone="warning">
                  {s}
                </ShellBadge>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--neutral-11)]">
                {t("dnsLeak.forgeResolvers")}
              </p>
              <pre className="max-h-72 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(
                  forgeResolvers.map((r) => ({
                    id: r.resolverId,
                    servers: r.servers,
                    answers: r.answers,
                    error: r.error,
                    ms: r.ms,
                  })),
                  null,
                  2,
                )}
              </pre>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--neutral-11)]">
                {t("dnsLeak.browserDoh")}
              </p>
              <pre className="max-h-72 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(
                  (Array.isArray(out.clientProbes) ? out.clientProbes : localProbes).map(
                    (p: ClientProbe | Record<string, unknown>) => ({
                      path: p.path,
                      answers: p.answers,
                      error: p.error,
                      ms: p.ms,
                    }),
                  ),
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>

          {authBlock ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--neutral-11)]">
                {t("dnsLeak.authorityDetail")}
              </p>
              <pre className="max-h-72 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(
                  {
                    sessionId: authBlock.id,
                    zone: authBlock.zone,
                    ready: authBlock.ready,
                    queryCount: authBlock.queryCount,
                    probeNames: authBlock.probeNames,
                    resolvers: authBlock.resolvers ?? [],
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--neutral-11)]">{t("dnsLeak.webrtc")}</p>
              <pre className="overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-[11px]">
                {JSON.stringify(
                  {
                    all: out.webrtcIps ?? localWebrtc,
                    public: out.webrtcPublic,
                    private: out.webrtcPrivate,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--neutral-11)]">
                {t("dnsLeak.egressMarkers")}
              </p>
              <pre className="overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-[11px]">
                {JSON.stringify(markers, null, 2)}
              </pre>
            </div>
          </div>

          {honesty?.reason ? (
            <RunnerNote>
              {t("dnsLeak.honestyPrefix")} {String(honesty.reason)}
            </RunnerNote>
          ) : null}
        </div>
      ) : (
        <RunnerNote>
          {infraStatus === "online" ? t("dnsLeak.idleOnline") : t("dnsLeak.idle")}
        </RunnerNote>
      )}

      <RunnerNote>{authorityOnline ? t("dnsLeak.noteOnline") : t("dnsLeak.note")}</RunnerNote>
    </div>
  );
}
