// @brand-exempt: operator-facing OIDC interaction unavailable copy
export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { uid } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md rounded-[var(--radius-xl)] border border-[var(--amber-7,hsl(var(--border)))] bg-background px-8 py-6 text-center shadow-[var(--elevation-md)]">
        <h1 className="text-xl font-semibold text-foreground">Login interaction unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nebutra-owned SSO still needs a canonical session handoff before it can complete OAuth
          login interactions.
        </p>
        {uid ? (
          <p className="mt-4 font-mono text-xs text-muted-foreground">interaction: {uid}</p>
        ) : null}
      </div>
    </div>
  );
}
