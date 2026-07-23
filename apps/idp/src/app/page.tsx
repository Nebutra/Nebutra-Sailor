// @brand-exempt: IdP landing copy for operator-facing discovery page
export default function IdPHomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-lg text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(90% 70% at 0% 0%, color-mix(in srgb, hsl(var(--primary)) 12%, transparent), transparent 60%), radial-gradient(90% 70% at 100% 100%, color-mix(in srgb, var(--cyan-9) 12%, transparent), transparent 60%)",
          }}
        />

        <div className="relative rounded-[var(--radius-xl)] border border-border bg-background p-12 shadow-[var(--elevation-lg)]">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)] text-3xl font-bold text-[hsl(var(--background))]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), var(--cyan-9))",
            }}
          >
            N
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nebutra Identity</h1>
          <p className="mt-3 text-muted-foreground">OAuth 2.0 / OpenID Connect Identity Provider</p>

          <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Discovery Endpoint
            </p>
            <code className="mt-2 block text-sm text-primary">
              /api/oidc/.well-known/openid-configuration
            </code>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            This server provides secure authentication for the Nebutra ecosystem.
          </div>
        </div>
      </div>
    </div>
  );
}
