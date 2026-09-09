import type { ResumeContentV1 } from "@nebutra/contracts/sleptons";
import { type DocEntry, type DocSection, type DocumentModel, toDocumentModel } from "./model";

export type DocumentMode = "design" | "print" | "ats";

interface ResumeDocumentProps {
  content: ResumeContentV1;
  mode?: DocumentMode;
  hideContact?: boolean;
}

const PAPER: Record<"A4" | "Letter", { width: string; height: string }> = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "216mm", height: "279mm" },
};

/**
 * Full résumé document. `design` = on-screen, tokens; `print` = paper-sized
 * sheet with margins from preferences; `ats` = single column, no icons, plain
 * headings, machine-readable order (spec §5). One theme, inherits html[data-brand].
 */
export function ResumeDocument({ content, mode = "design", hideContact }: ResumeDocumentProps) {
  const model = toDocumentModel(content, { hideContact });
  if (mode === "ats") return <AtsDocument model={model} />;

  const { paper, margins, show_icons } = content.preferences;
  const sheet =
    mode === "print"
      ? {
          width: PAPER[paper].width,
          minHeight: PAPER[paper].height,
          padding: `${margins.top} ${margins.right} ${margins.bottom} ${margins.left}`,
        }
      : undefined;

  return (
    <article
      data-resume-mode={mode}
      style={sheet}
      className={
        mode === "print"
          ? "mx-auto bg-white text-[11pt] leading-snug text-black print:m-0 print:shadow-none"
          : "text-sm text-foreground"
      }
    >
      <header className="mb-5 border-b border-current/20 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {model.name}
          {model.nameEn && (
            <span className="ml-2 text-base font-normal opacity-70">{model.nameEn}</span>
          )}
        </h1>
        {model.headline && <p className="mt-1 opacity-80">{model.headline}</p>}
        {(model.contact.length > 0 || model.links.length > 0) && (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-70">
            {model.contact.map((c) => (
              <span key={c}>{c}</span>
            ))}
            {model.links.map((l) => (
              <a key={l.href} href={l.href} className="underline decoration-current/40">
                {show_icons ? `↗ ${l.label}` : l.label}
              </a>
            ))}
          </p>
        )}
        {model.advantageTags.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1">
            {model.advantageTags.map((t) => (
              <span
                key={t}
                className="rounded border border-current/25 px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
              >
                {t}
              </span>
            ))}
          </p>
        )}
      </header>

      <div className="grid gap-5">
        {model.sections.map((s) => (
          <Section key={s.id} section={s} />
        ))}
      </div>
    </article>
  );
}

function Section({ section }: { section: DocSection }) {
  return (
    <section aria-labelledby={`sec-${section.id}`} className="break-inside-avoid">
      <h2
        id={`sec-${section.id}`}
        className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70"
      >
        {section.title}
      </h2>
      {section.text && <p className="whitespace-pre-line">{section.text}</p>}
      {section.groups && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          {section.groups.map((g) => (
            <div key={g.label} className="contents">
              <dt className="font-medium">{g.label}</dt>
              <dd>{g.values.join(", ")}</dd>
            </div>
          ))}
        </dl>
      )}
      {section.entries.length > 0 && (
        <div className="grid gap-3">
          {section.entries.map((e, i) => (
            <Entry key={`${section.id}-${i}`} entry={e} />
          ))}
        </div>
      )}
    </section>
  );
}

function Entry({ entry }: { entry: DocEntry }) {
  return (
    <div className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <div>
          <span className="font-medium">{entry.title}</span>
          {entry.subtitle && <span className="opacity-80"> · {entry.subtitle}</span>}
          {entry.link && (
            <a href={entry.link} className="ml-2 text-xs underline opacity-70">
              link
            </a>
          )}
        </div>
        {entry.meta && <span className="text-xs opacity-70">{entry.meta}</span>}
      </div>
      {entry.bullets.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {entry.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {entry.tags && entry.tags.length > 0 && (
        <p className="mt-1 text-xs opacity-70">{entry.tags.join(" · ")}</p>
      )}
    </div>
  );
}

/** Plain, single-column, no styling beyond structure. What a parser sees. */
function AtsDocument({ model }: { model: DocumentModel }) {
  return (
    <article data-resume-mode="ats" className="font-mono text-sm leading-relaxed text-foreground">
      <h1 className="font-semibold">
        {model.name}
        {model.nameEn ? ` (${model.nameEn})` : ""}
      </h1>
      {model.headline && <p>{model.headline}</p>}
      {model.contact.length > 0 && <p>{model.contact.join(" | ")}</p>}
      {model.links.length > 0 && (
        <p>{model.links.map((l) => `${l.label}: ${l.href}`).join(" | ")}</p>
      )}
      {model.advantageTags.length > 0 && <p>Tags: {model.advantageTags.join(", ")}</p>}
      {model.sections.map((s) => (
        <section key={s.id} className="mt-4">
          <h2 className="font-semibold uppercase">{s.title}</h2>
          {s.text && <p>{s.text}</p>}
          {s.groups?.map((g) => (
            <p key={g.label}>
              {g.label}: {g.values.join(", ")}
            </p>
          ))}
          {s.entries.map((e, i) => (
            <div key={`${s.id}-${i}`} className="mt-2">
              <p>{[e.title, e.subtitle, e.meta].filter(Boolean).join(" | ")}</p>
              {e.bullets.map((b) => (
                <p key={b}>- {b}</p>
              ))}
              {e.tags && e.tags.length > 0 && <p>Skills: {e.tags.join(", ")}</p>}
              {e.link && <p>{e.link}</p>}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
