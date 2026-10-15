import { CopyButton } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";

/**
 * A request a buyer can paste as-is: real base URL, a model on the shelf, the
 * key read from the environment. An exhibit surface — it does not move.
 */
export function CodeSample({ title, code }: { title: string; code: string }) {
  const t = useTranslations("shelf");
  return (
    <figure className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <figcaption className="flex h-10 items-center justify-between gap-2 border-b border-border pr-1.5 pl-4">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <CopyButton value={code} label={t("copy")} copiedLabel={t("copied")} size="sm" />
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
