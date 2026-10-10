import { type Lang, UI } from "@/lib/i18n";
import { ExternalIcon, MarkdownIcon } from "./icons";

/** The page as Markdown (the file agents read at <page>.md), its source and its edit link. */
export function PageActions({
  lang,
  markdown,
  edit,
  source,
}: {
  lang: Lang;
  markdown: string;
  edit: string;
  source?: string | undefined;
}) {
  const t = UI[lang];
  return (
    <div className="kcq-page-actions">
      <a className="kcq-chip" href={markdown} type="text/markdown">
        <MarkdownIcon />
        {t.viewMarkdown}
      </a>
      {source ? (
        <a className="kcq-chip" href={source} rel="noopener">
          <ExternalIcon />
          {t.viewSource}
        </a>
      ) : null}
      <a className="kcq-chip" href={edit} rel="noopener">
        <ExternalIcon />
        {t.editOnGithub}
      </a>
    </div>
  );
}
