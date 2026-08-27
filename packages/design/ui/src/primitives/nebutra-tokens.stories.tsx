import type { Meta, StoryObj } from "@storybook/react";

const tokenGroups = [
  {
    label: "Neutral",
    tokens: ["--neutral-1", "--neutral-3", "--neutral-7", "--neutral-11", "--neutral-12"],
  },
  {
    label: "Brand",
    tokens: ["--brand-primary", "--brand-accent", "--blue-9", "--cyan-9"],
  },
  {
    label: "Status",
    tokens: ["--status-success", "--status-warning", "--status-danger"],
  },
] as const;

function NebutraTokensContract() {
  return (
    <div className="grid w-[48rem] gap-5 rounded-[var(--radius-lg)] border bg-card p-5 text-card-foreground">
      <div className="grid gap-1">
        <h2 className="font-medium text-base">Nebutra token bootstrap</h2>
        <p className="text-muted-foreground text-sm">
          Visual contract for the registry theme manifest and the `@nebutra/tokens` runtime
          stylesheet.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tokenGroups.map((group) => (
          <section
            className="rounded-[var(--radius-md)] border bg-background p-3"
            key={group.label}
          >
            <h3 className="mb-3 font-medium text-foreground text-sm">{group.label}</h3>
            <div className="flex flex-wrap gap-2">
              {group.tokens.map((token) => (
                <span className="grid gap-1" key={token}>
                  <span
                    aria-label={token}
                    role="img"
                    className="size-10 rounded-[var(--radius-sm)] border border-border shadow-sm"
                    style={{ background: `var(${token})` }}
                  />
                  <span className="max-w-24 truncate font-mono text-muted-foreground text-[10px]">
                    {token}
                  </span>
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: "Foundations/NebutraTokens",
  component: NebutraTokensContract,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Token foundation contract for registry consumers. Runtime source of truth remains @nebutra/tokens/styles.css.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof NebutraTokensContract>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkSurface: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6 text-foreground">
      <NebutraTokensContract />
    </div>
  ),
};
