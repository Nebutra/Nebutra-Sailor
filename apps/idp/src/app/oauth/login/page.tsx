export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { uid } = await searchParams;

  return (
    <div className="p-4 flex min-h-screen items-center justify-center">
      <div className="border-amber-500/20 bg-amber-950/30 max-w-md px-8 py-6 backdrop-blur-xl rounded-2xl border text-center">
        <h1 className="text-xl font-semibold text-amber-300">Login interaction unavailable</h1>
        <p className="mt-2 text-sm text-amber-100/70">
          Nebutra-owned SSO still needs a canonical session handoff before it can complete OAuth
          login interactions.
        </p>
        {uid ? (
          <p className="mt-4 font-mono text-xs text-amber-100/50">interaction: {uid}</p>
        ) : null}
      </div>
    </div>
  );
}
