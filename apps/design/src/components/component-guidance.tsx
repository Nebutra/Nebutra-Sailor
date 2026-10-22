/**
 * Keyboard, accessibility and usage guidance.
 *
 * Unlike the API table this is editorial: how a keyboard path behaves is a
 * claim about behaviour, not something a type can say. The content lives in
 * lib/components/guidance.ts and is checked against the live specimen on the
 * same page, which is the reason it sits beside the examples.
 */

// biome-ignore-all lint/a11y/noRedundantRoles: Below md the rows are display-overridden to stack, which drops native table semantics in Safari/VoiceOver; the explicit roles restore them.
import { Check, Cross } from "@nebutra/icons";
import type { Guidance, Rule } from "@/lib/components/guidance";

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded-[var(--radius-sm)] border border-border bg-background px-1.5 py-0.5 font-mono text-foreground text-xs">
      {children}
    </kbd>
  );
}

export function KeyboardTable({ rows }: { rows: NonNullable<Guidance["keyboard"]> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-sm" role="table">
        <thead className="max-md:sr-only" role="rowgroup">
          <tr className="border-border border-b bg-background" role="row">
            <th
              className="w-[34%] px-4 py-2 text-left font-medium text-muted-foreground text-xs"
              role="columnheader"
              scope="col"
            >
              Key
            </th>
            <th
              className="px-4 py-2 text-left font-medium text-muted-foreground text-xs"
              role="columnheader"
              scope="col"
            >
              What happens
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((row) => (
            <tr
              className="border-border border-b align-top last:border-b-0 max-md:flex max-md:flex-col max-md:gap-1.5 max-md:px-4 max-md:py-3"
              key={`${row.keys.join("+")}: ${row.does}`}
              role="row"
            >
              <td className="px-4 py-3 max-md:block max-md:p-0" role="cell">
                <span className="flex flex-wrap items-center gap-1.5">
                  {row.keys.map((key, index) => (
                    <span className="inline-flex items-center gap-1.5" key={key}>
                      {index > 0 ? (
                        <span aria-hidden className="text-muted-foreground text-xs">
                          or
                        </span>
                      ) : null}
                      <Key>{key}</Key>
                    </span>
                  ))}
                </span>
              </td>
              <td className="px-4 py-3 text-neutral-11 max-md:block max-md:p-0" role="cell">
                {row.does}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function A11yList({ items }: { items: NonNullable<Guidance["a11y"]> }) {
  return (
    <ul className="m-0 grid list-none gap-x-8 gap-y-5 p-0 md:grid-cols-2">
      {items.map((item) => (
        <li className="flex flex-col gap-1" key={item.title}>
          <span className="font-medium text-foreground text-sm">{item.title}</span>
          <span className="text-neutral-11 text-sm">{item.body}</span>
        </li>
      ))}
    </ul>
  );
}

export function DoDont({ dos, donts }: { dos: Rule[]; donts: Rule[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RuleColumn rules={dos} tone="do" />
      <RuleColumn rules={donts} tone="dont" />
    </div>
  );
}

function RuleColumn({ rules, tone }: { rules: Rule[]; tone: "do" | "dont" }) {
  const isDo = tone === "do";

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-border border-b bg-background px-4 py-2">
        {isDo ? (
          <Check aria-hidden className="size-4 text-[hsl(var(--success-strong))]" />
        ) : (
          <Cross aria-hidden className="size-4 text-destructive-strong" />
        )}
        <h3 className="m-0 font-medium text-foreground text-sm">{isDo ? "Do" : "Don't"}</h3>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {rules.map((rule) => (
          <li
            className="flex flex-col gap-2 border-border border-b px-4 py-4 last:border-b-0"
            key={rule.title}
          >
            <span className="font-medium text-foreground text-sm">{rule.title}</span>
            <span className="text-neutral-11 text-sm">{rule.body}</span>
            {rule.code ? (
              <pre className="m-0 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-foreground text-xs leading-relaxed">
                <code>{rule.code}</code>
              </pre>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
