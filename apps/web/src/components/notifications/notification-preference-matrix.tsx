import type {
  NotificationPreferenceSection,
  NotificationPreferenceSource,
  NotificationRuntimeStatus,
} from "@nebutra/notifications";
import { Info, ShieldAlert } from "lucide-react";
import { updateNotificationPreference } from "@/app/[locale]/(app)/settings/notifications/actions";

interface Props {
  locale: string;
  runtime: NotificationRuntimeStatus;
  preferenceSource: NotificationPreferenceSource;
  sections: NotificationPreferenceSection[];
}

const VISIBLE_CHANNELS = new Set(["in_app", "email", "push"]);

function getCellButtonClasses(enabled: boolean, editable: boolean): string {
  if (!editable) {
    return "cursor-not-allowed border-[var(--neutral-7)] bg-[var(--neutral-2)] text-[var(--neutral-9)]";
  }

  if (enabled) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  }

  return "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]";
}

export function NotificationPreferenceMatrix({
  locale,
  runtime,
  preferenceSource,
  sections,
}: Props) {
  return (
    <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--neutral-12)]">Delivery matrix</h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-11)]">
            Copy-first from the proven `supastarter` pattern, but adapted to Nebutra&apos;s
            operator-facing signals. Each cell controls whether a notification category is allowed
            to reach you through that channel.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
            runtime.canManagePreferences
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {runtime.canManagePreferences ? (
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Info className="h-3.5 w-3.5" aria-hidden />
          )}
          {preferenceSource === "provider" ? "Live preferences" : "Defaults preview"}
        </div>
      </div>

      {!runtime.canManagePreferences ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Changes are disabled here because the current notification runtime does not expose durable
          preference storage yet.
        </div>
      ) : null}

      <div className="mt-6 space-y-8">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-[var(--neutral-12)]">{section.title}</h4>
              <p className="mt-1 text-sm text-[var(--neutral-11)]">{section.description}</p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--neutral-7)]">
              <table className="min-w-[720px] w-full border-collapse">
                <thead className="bg-[var(--neutral-2)] text-left">
                  <tr className="border-b border-[var(--neutral-7)]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]">
                      Signal
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]">
                      Inbox
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]">
                      Email
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]">
                      Push
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-10)]">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--neutral-7)] last:border-b-0">
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-medium text-[var(--neutral-12)]">{row.label}</p>
                        <p className="mt-1 text-sm text-[var(--neutral-11)]">{row.description}</p>
                      </td>

                      {row.cells.slice(0, 3).map((cell) => (
                        <td key={cell.channel} className="px-4 py-4 align-top">
                          {cell.supported ? (
                            <form action={updateNotificationPreference}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="type" value={row.id} />
                              <input type="hidden" name="channel" value={cell.channel} />
                              <input type="hidden" name="enabled" value={String(!cell.enabled)} />
                              <button
                                type="submit"
                                disabled={!cell.editable}
                                title={cell.reason}
                                className={`inline-flex min-w-20 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${getCellButtonClasses(
                                  cell.enabled,
                                  cell.editable,
                                )}`}
                              >
                                {cell.enabled ? "On" : "Off"}
                              </button>
                            </form>
                          ) : (
                            <span className="inline-flex rounded-full border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-10)]">
                              N/A
                            </span>
                          )}
                        </td>
                      ))}

                      <td className="px-4 py-4 align-top">
                        <ul className="space-y-1 text-sm text-[var(--neutral-11)]">
                          {row.cells
                            .filter((cell) => VISIBLE_CHANNELS.has(cell.channel) && cell.reason)
                            .slice(0, 2)
                            .map((cell) => (
                              <li key={cell.channel}>
                                <span className="font-medium text-[var(--neutral-12)]">
                                  {cell.channelLabel}:
                                </span>{" "}
                                {cell.reason}
                              </li>
                            ))}
                          {row.cells.every((cell) => !cell.reason) ? (
                            <li>
                              <span className="font-medium text-[var(--neutral-12)]">Default:</span>{" "}
                              Routed only where this signal is meant to stay high-signal.
                            </li>
                          ) : null}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
