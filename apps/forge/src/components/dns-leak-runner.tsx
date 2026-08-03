"use client";

/**
 * DNS leak workbench — dual-surface.
 *
 * Browser: DoH multi-path + WebRTC ICE candidates.
 * Server: multi-resolver A probes + egress whoami markers + edge IP.
 *
 * Hard-correct: we do NOT claim a full OS-system DNS leak map without an
 * authoritative leak zone (dnsleaktest.com style).
 */
import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
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
    return {
      path: ep.path,
      kind: "doh",
      name,
      answers: [],
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - started,
    };
  }
}

function extractIpFromCandidate(candidate: string): string | null {
  // host candidates: candidate:… typ host …
  // srflx/relay may embed IPv4/IPv6
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

export function DnsLeakRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [probeHost, setProbeHost] = useState("cloudflare.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [localProbes, setLocalProbes] = useState<ClientProbe[]>([]);
  const [localWebrtc, setLocalWebrtc] = useState<string[]>([]);

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    setOut(null);
    const host = probeHost.trim() || "cloudflare.com";
    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 12)
        : `s${Date.now().toString(36)}`;

    try {
      const [dohResults, webrtcIps] = await Promise.all([
        Promise.all(DOH_ENDPOINTS.map((ep) => queryDoh(ep, host))),
        gatherWebrtcIps(),
      ]);
      setLocalProbes(dohResults);
      setLocalWebrtc(webrtcIps);

      const r = await invokeForge(toolId, {
        probeHost: host,
        sessionId,
        clientProbes: dohResults,
        webrtcIps,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setOut(r.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  const headline =
    verdict === "consistent"
      ? t("dnsLeak.verdictConsistent")
      : verdict === "split_paths"
        ? t("dnsLeak.verdictSplit")
        : verdict === "ip_mismatch"
          ? t("dnsLeak.verdictIpMismatch")
          : verdict === "incomplete"
            ? t("dnsLeak.verdictIncomplete")
            : t("dnsLeak.idle");

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
      </div>

      <RunnerError>{error}</RunnerError>

      {out ? (
        <div className="space-y-4">
          <ShellVerdict
            tone={tone}
            headline={headline}
            caveat={honesty?.recommendation ? String(honesty.recommendation) : t("dnsLeak.note")}
          />
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
                    localProbes.length,
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
        <RunnerNote>{t("dnsLeak.idle")}</RunnerNote>
      )}

      <RunnerNote>{t("dnsLeak.note")}</RunnerNote>
    </div>
  );
}
