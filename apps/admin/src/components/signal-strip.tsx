import type { AdminDomain, AdminManifest, SignalReading } from "@nebutra/contracts/admin";
import { type ContractCaller, probeSignal } from "@/lib/contract-client";
import { relativeTime, type StatusTone } from "@/lib/format";
import { StatusDot } from "./status-dot";

/**
 * Every signal a domain declares, probed now. ok = green, raised = the
 * signal's severity, probe failure = grey "unknown" with the error.
 */
function toneFor(reading: SignalReading): StatusTone {
  if (reading.status === "ok") return "ok";
  if (reading.status === "unknown") return "unknown";
  return reading.severity === "critical" ? "bad" : "warn";
}

export async function SignalStrip({
  manifest,
  domain,
  caller,
}: {
  manifest: AdminManifest;
  domain: AdminDomain;
  caller: ContractCaller;
}) {
  const now = Date.now();
  const readings = await Promise.all(
    domain.signals.map(async (signal) => {
      try {
        return { signal, reading: await probeSignal(manifest, signal, caller) };
      } catch (error) {
        const reading: SignalReading = {
          id: signal.id,
          status: "unknown",
          severity: signal.severity,
          probedAt: new Date().toISOString(),
          detail: error instanceof Error ? error.message : "probe failed",
        };
        return { signal, reading };
      }
    }),
  );
  if (readings.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {readings.map(({ signal, reading }) => (
        <div
          key={signal.id}
          className="flex flex-col gap-1.5 rounded-md border border-border bg-card px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <StatusDot tone={toneFor(reading)} />
            <span className="font-medium text-sm leading-5">{reading.title ?? signal.label}</span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">{signal.id}</span>
          </div>
          <p className="text-muted-foreground text-xs leading-4">
            {reading.status === "ok"
              ? "OK"
              : reading.status === "unknown"
                ? `Unknown · ${reading.detail ?? "probe failed"}`
                : (reading.detail ?? "Raised")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            probed {relativeTime(reading.probedAt, now)}
          </p>
        </div>
      ))}
    </div>
  );
}
