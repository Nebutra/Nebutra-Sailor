import { MagnifyingGlass } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/primitives";

/**
 * A plain GET form to /models — works before hydration and without JS, and the
 * result is a shareable URL. Extra hidden fields keep the active filters.
 */
export function SearchForm({
  className,
  placeholder,
  label,
  submitLabel,
  defaultValue,
  keep,
}: {
  className?: string;
  placeholder: string;
  label: string;
  submitLabel: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <search className={className}>
      <form action="/models" method="get" className="flex gap-2">
        {keep
          ? Object.entries(keep).map(([name, value]) =>
              value ? (
                <input data-allow-native key={name} type="hidden" name={name} value={value} />
              ) : null,
            )
          : null}
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{label}</span>
          <MagnifyingGlass
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="h-10 pl-9"
          />
        </label>
        <Button type="submit" variant="outline" className="h-10">
          {submitLabel}
        </Button>
      </form>
    </search>
  );
}
