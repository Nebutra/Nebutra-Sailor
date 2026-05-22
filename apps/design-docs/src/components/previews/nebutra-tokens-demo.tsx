const tokenGroups = [
  {
    label: "Neutral ramp",
    description: "Surface, border, and foreground contrast rails.",
    tokens: ["--neutral-1", "--neutral-3", "--neutral-7", "--neutral-11", "--neutral-12"],
  },
  {
    label: "Brand rail",
    description: "Identity anchors consumed through semantic aliases.",
    tokens: ["--brand-primary", "--brand-accent", "--blue-9", "--cyan-9"],
  },
  {
    label: "Status rail",
    description: "Semantic state colors for validation and lifecycle UI.",
    tokens: ["--status-success", "--status-warning", "--status-danger"],
  },
] as const;

export function NebutraTokensDemo() {
  return (
    <div className="grid w-full max-w-3xl gap-5 rounded-[var(--radius-lg)] border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">Runtime CSS variable contract</p>
        <p className="text-muted-foreground text-sm">
          Registry consumers install the bootstrap manifest; product surfaces consume the package
          stylesheet as the source of truth.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tokenGroups.map((group) => (
          <section
            aria-label={group.label}
            className="rounded-[var(--radius-md)] border bg-background p-3"
            key={group.label}
          >
            <div className="mb-3">
              <h3 className="font-medium text-foreground text-sm">{group.label}</h3>
              <p className="text-muted-foreground text-xs leading-5">{group.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.tokens.map((token) => (
                <span className="grid gap-1" key={token}>
                  <span
                    aria-label={token}
                    role="img"
                    className="size-9 rounded-[var(--radius-sm)] border border-border shadow-sm"
                    style={{ background: `var(${token})` }}
                  />
                  <span className="max-w-20 truncate font-mono text-muted-foreground text-[10px]">
                    {token}
                  </span>
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-2 rounded-[var(--radius-md)] border bg-muted/40 p-3 font-mono text-xs">
        <code>@import &quot;@nebutra/tokens/styles.css&quot;;</code>
        <code>npx shadcn@latest add https://ui.nebutra.com/r/nebutra-tokens.json</code>
      </div>
    </div>
  );
}
