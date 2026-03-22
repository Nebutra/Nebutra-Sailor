import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, PageHeader } from "@nebutra/ui/layout";

const CONTROLS = [
  { name: "Access logging", status: "Passing", detail: "Events retained for 90 days." },
  { name: "Data encryption", status: "Passing", detail: "At-rest and in-transit enabled." },
  { name: "Secret rotation", status: "Needs review", detail: "Last rotation 31 days ago." },
  { name: "Webhook signature checks", status: "Passing", detail: "Verification active." },
] as const;

function statusClassName(status: string) {
  if (status === "Passing") {
    return "bg-cyan-3 text-cyan-11 dark:bg-(--cyan-9)/20 dark:text-cyan-9";
  }

  return "bg-[hsl(var(--warning)/0.14)] text-warning-foreground";
}

export default function AuditPage() {
  return (
    <section className="mx-auto w-full max-w-7xl" aria-label="Audit">
      <AnimateIn preset="fadeUp">
        <PageHeader title="Audit" description="Operational controls and compliance checkpoints." />
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-4 lg:grid-cols-2">
        <AnimateIn preset="fadeUp">
          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
              Control Checklist
            </h2>
            <div className="mt-4 space-y-3">
              {CONTROLS.map((control) => (
                <div
                  key={control.name}
                  className="rounded-lg border border-neutral-7 p-3 dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-neutral-12 dark:text-white">
                      {control.name}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(control.status)}`}
                    >
                      {control.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
                    {control.detail}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </AnimateIn>

        <AnimateIn preset="fadeUp">
          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
              Recent Events
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-11 dark:text-white/70">
              <li className="rounded-lg border border-neutral-7 px-3 py-2 dark:border-white/10">
                2026-03-03 20:45 UTC · Billing webhook signature validated.
              </li>
              <li className="rounded-lg border border-neutral-7 px-3 py-2 dark:border-white/10">
                2026-03-03 18:10 UTC · New admin invited to workspace.
              </li>
              <li className="rounded-lg border border-neutral-7 px-3 py-2 dark:border-white/10">
                2026-03-03 14:22 UTC · Data export completed.
              </li>
            </ul>
          </Card>
        </AnimateIn>
      </AnimateInGroup>
    </section>
  );
}
