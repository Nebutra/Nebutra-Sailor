import { cn } from "@nebutra/ui/utils";

/**
 * A block of source, for the install and usage pages.
 *
 * Plain text on a card — no highlighter — because the samples are four to
 * eight lines and a highlighter is a runtime to ship for colour the reader does
 * not need. It scrolls sideways rather than wrapping, so a line stays a line.
 */
export function CodeSample({
  code,
  caption,
  className,
}: {
  code: string;
  /** The file the sample belongs in, shown above it. */
  caption?: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "m-0 overflow-hidden rounded-lg border border-hairline bg-card shadow-xs",
        className,
      )}
    >
      {caption ? (
        <figcaption className="border-hairline border-b bg-muted/40 px-4 py-2 font-mono text-muted-foreground text-xs">
          {caption}
        </figcaption>
      ) : null}
      <pre className="m-0 overflow-x-auto p-4 font-mono text-foreground text-ui leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
