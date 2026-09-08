import { roleAtLeast } from "@nebutra/contracts/admin";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { FleetStrip } from "@/components/fleet-strip";
import { PageTitle, Panel } from "@/components/panel";
import { StatusDot } from "@/components/status-dot";
import { cachedFleet, cachedInbox } from "@/lib/console-data";
import { environmentLabel, relativeTime, type StatusTone } from "@/lib/format";
import type { InboxItem } from "@/lib/inbox";
import { requireStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

/**
 * Inbox — the first page answers "is anything wrong?" An item exists only
 * while a product's signal is raised; nothing here is filler. Empty is the
 * good state.
 */
const SEVERITY_TONE: Record<InboxItem["reading"]["severity"], StatusTone> = {
  critical: "bad",
  warn: "warn",
  info: "ok",
};

function serviceIdFor(item: InboxItem): string {
  return item.manifest.product === "router"
    ? "@nebutra/router"
    : `@nebutra/${item.manifest.product}`;
}

function InboxRow({ item, role, now }: { item: InboxItem; role: string; now: number }) {
  const unknown = item.reading.status === "unknown";
  const action =
    item.action &&
    !unknown &&
    roleAtLeast(role as Parameters<typeof roleAtLeast>[0], item.action.role)
      ? item.action
      : null;
  return (
    <li className="flex items-center gap-3.5 border-border border-b px-4 py-3.5 last:border-b-0">
      <StatusDot tone={unknown ? "unknown" : SEVERITY_TONE[item.reading.severity]} />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm leading-5">
          {item.reading.title ?? item.signal.label}
        </div>
        <div className="text-muted-foreground text-xs leading-[18px]">
          {item.reading.detail ?? (unknown ? "probe failed" : item.signal.label)}
        </div>
      </div>
      <span className="rounded-full bg-muted px-2 text-[11px] text-muted-foreground leading-4">
        {item.productLabel}
      </span>
      <span className="whitespace-nowrap text-muted-foreground text-xs">
        {relativeTime(item.reading.probedAt, now)}
      </span>
      {action ? (
        <ActionButton
          serviceId={serviceIdFor(item)}
          actionId={action.id}
          verb={action.verb}
          description={action.description}
          destructive={action.destructive}
          variant="ink"
        />
      ) : null}
    </li>
  );
}

export default async function InboxPage() {
  const staff = await requireStaff();
  const caller = { userId: staff.userId, role: staff.role };
  const [inbox, fleet] = await Promise.all([cachedInbox(caller), cachedFleet()]);
  const now = Date.now();
  const strip = [...fleet]
    .sort((a, b) => Number(b.health !== null) - Number(a.health !== null))
    .slice(0, 8);
  const drift = fleet.filter((r) => r.targetMatchesRuntime === false).length;
  const latestProbe = fleet
    .map((r) => r.probedAt)
    .filter((p): p is string => !!p)
    .sort()
    .at(-1);
  const today = new Date(now).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <PageTitle title="Inbox" subtitle={`${today} · ${environmentLabel()}`} />

      <Panel
        title="Needs attention"
        count={inbox.items.length}
        aside={
          <span className="text-muted-foreground text-xs">
            probed {relativeTime(inbox.probedAt, now)}
          </span>
        }
      >
        {inbox.items.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground text-sm">
            Nothing needs you. Next probe in 30 s.
          </p>
        ) : (
          <ul>
            {inbox.items.map((item) => (
              <InboxRow key={item.key} item={item} role={staff.role} now={now} />
            ))}
          </ul>
        )}
      </Panel>

      {inbox.unknown.length > 0 ? (
        <Panel
          title="Unknown"
          count={inbox.unknown.length}
          description="Signals whose probe failed. Not green, not red — not known."
        >
          <ul>
            {inbox.unknown.map((item) => (
              <InboxRow key={item.key} item={item} role={staff.role} now={now} />
            ))}
          </ul>
        </Panel>
      ) : null}

      {inbox.failures.length > 0 ? (
        <Panel title="Unreachable products" count={inbox.failures.length}>
          <ul>
            {inbox.failures.map((f) => (
              <li
                key={f.serviceId}
                className="flex items-center gap-3.5 border-border border-b px-4 py-3 last:border-b-0"
              >
                <StatusDot tone="bad" />
                <span className="font-mono text-sm">{f.serviceId}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
                  {f.error}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title="Fleet"
        count={`${fleet.length}${drift ? ` · ${drift} drift` : ""}`}
        aside={
          <>
            <span className="text-muted-foreground text-xs">
              {latestProbe ? `probed ${relativeTime(latestProbe, now)}` : "not probed"}
            </span>
            <Link href="/fleet" className="text-muted-foreground text-xs hover:text-foreground">
              All {fleet.length} services →
            </Link>
          </>
        }
      >
        <FleetStrip rows={strip} />
      </Panel>
    </>
  );
}
