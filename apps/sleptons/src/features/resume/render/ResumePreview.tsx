import { ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import { deriveResume } from "@/lib/resume/derive";
import type { EditorContent } from "../editor/state";

/**
 * Compact live preview for the editor's right pane. Renders what the member
 * card and the public page will surface first (headline, highlights, skills),
 * then a plain section list. The full document renderer (print/ATS modes,
 * ported from CVise) lands later in R1; this keeps the split-screen loop alive.
 */
export function ResumePreview({ content }: { content: EditorContent }) {
  const parsed = ResumeContentV1Schema.safeParse(content);
  if (!parsed.success) {
    return (
      <div className="text-sm text-muted-foreground">
        Preview updates once the required fields are valid.
      </div>
    );
  }
  const c = parsed.data;
  const d = deriveResume(c);

  return (
    <div className="grid gap-6 text-sm">
      <header>
        <h2 className="text-xl font-semibold text-foreground">{c.basic.name}</h2>
        {d.headline && <p className="mt-1 text-muted-foreground">{d.headline}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Completeness {d.completeness}%
          {d.years_active !== null && ` · ${d.years_active} yrs active`}
        </p>
      </header>

      {d.highlights.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Card highlights
          </h3>
          <ul className="list-disc pl-5 text-foreground">
            {d.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      )}

      {d.skills_flat.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Matching skills
          </h3>
          <div className="flex flex-wrap gap-1">
            {d.skills_flat.map((s) => (
              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {c.ventures?.map((v) => (
        <Entry
          key={`v-${v.name}`}
          title={v.name}
          meta={[v.role, v.period, v.stage].filter(Boolean).join(" · ")}
          lines={[v.outcome, ...(v.details ?? [])].filter((x): x is string => Boolean(x))}
        />
      ))}
      {c.experiences?.map((e, i) => (
        <Entry
          key={`e-${i}`}
          title={`${e.title} · ${e.org}`}
          meta={e.period}
          lines={e.details ?? []}
        />
      ))}
      {c.projects?.map((p) => (
        <Entry
          key={`p-${p.name}`}
          title={p.name}
          meta={[p.role, p.period].filter(Boolean).join(" · ")}
          lines={p.details ?? []}
        />
      ))}
      {c.education?.map((e, i) => (
        <Entry
          key={`ed-${i}`}
          title={e.school}
          meta={[e.degree, e.major, e.period].filter(Boolean).join(" · ")}
          lines={[]}
        />
      ))}
    </div>
  );
}

function Entry({ title, meta, lines }: { title: string; meta?: string; lines: string[] }) {
  return (
    <section>
      <h3 className="font-medium text-foreground">{title}</h3>
      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      {lines.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-foreground">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
