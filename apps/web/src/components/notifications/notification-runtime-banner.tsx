import type {
  NotificationInboxSource,
  NotificationPreferenceSource,
  NotificationRuntimeStatus,
} from "@nebutra/notifications";
import { BellRing, DatabaseZap, RadioTower } from "lucide-react";

interface Props {
  runtime: NotificationRuntimeStatus;
  preferenceSource: NotificationPreferenceSource;
  inboxSource: NotificationInboxSource;
}

function getModeLabel(runtime: NotificationRuntimeStatus): string {
  switch (runtime.mode) {
    case "managed":
      return "Managed";
    case "self_hosted":
      return "Self-hosted";
    default:
      return "Preview";
  }
}

function getModeClasses(runtime: NotificationRuntimeStatus): string {
  switch (runtime.mode) {
    case "managed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "self_hosted":
      return "border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

export function NotificationRuntimeBanner({ runtime, preferenceSource, inboxSource }: Props) {
  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-[var(--neutral-2)] p-2 text-[var(--neutral-11)]">
              <BellRing className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--neutral-12)]">
                {runtime.providerLabel} notification runtime
              </h3>
              <p className="mt-1 text-sm text-[var(--neutral-11)]">{runtime.summary}</p>
            </div>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getModeClasses(runtime)}`}
        >
          {getModeLabel(runtime)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--neutral-12)]">
            <DatabaseZap className="h-4 w-4 text-[var(--neutral-11)]" aria-hidden />
            Preferences
          </div>
          <p className="mt-2 text-sm text-[var(--neutral-11)]">
            {preferenceSource === "provider"
              ? "Loaded from the connected notification backend."
              : "Showing Nebutra default policy because persistent preference storage is not connected."}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--neutral-12)]">
            <RadioTower className="h-4 w-4 text-[var(--neutral-11)]" aria-hidden />
            Inbox
          </div>
          <p className="mt-2 text-sm text-[var(--neutral-11)]">
            {inboxSource === "provider"
              ? "Recent in-app messages are loaded from the notification inbox backend."
              : "Inbox preview will become live once persistent in-app storage is connected."}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
          <div className="text-sm font-medium text-[var(--neutral-12)]">Missing integration</div>
          <p className="mt-2 text-sm text-[var(--neutral-11)]">
            {runtime.missing.length > 0
              ? runtime.missing.join(" · ")
              : "No known gaps for this runtime."}
          </p>
        </div>
      </div>

      {runtime.reason ? (
        <p className="mt-4 text-sm text-[var(--neutral-11)]">{runtime.reason}</p>
      ) : null}
    </section>
  );
}
