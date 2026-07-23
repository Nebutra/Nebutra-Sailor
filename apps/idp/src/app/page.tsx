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
              "radial-gradient(90% 70% at 0% 0%, color-mix(in srgb, var(--blue-9) 12%, transparent), transparent 60%), radial-gradient(90% 70% at 100% 100%, color-mix(in srgb, var(--cyan-9) 12%, transparent), transparent 60%)",
          }}
        />

        <div className="relative rounded-[var(--radius-xl)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-12 shadow-[var(--elevation-lg)]">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)] text-3xl font-bold text-[var(--neutral-1)]"
            style={{
              background: "linear-gradient(135deg, var(--blue-9), var(--cyan-9))",
            }}
          >
            N
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[var(--neutral-12)]">
            Nebutra Identity
          </h1>
          <p className="mt-3 text-[var(--neutral-10)]">
            OAuth 2.0 / OpenID Connect Identity Provider
          </p>

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--neutral-9)]">
              Discovery Endpoint
            </p>
            <code className="mt-2 block text-sm text-[var(--blue-11)]">
              /api/oidc/.well-known/openid-configuration
            </code>
          </div>

          <div className="mt-6 text-xs text-[var(--neutral-9)]">
            This server provides secure authentication for the Nebutra ecosystem.
          </div>
        </div>
      </div>
    </div>
  );
}
