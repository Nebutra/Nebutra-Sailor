import Link from "next/link";
import { CredentialsForm } from "@/components/credentials-form";
<<<<<<< HEAD
import { resolvePostLoginReturnTo } from "@/lib/return-to";
=======
import { resolveAppOrigin, resolvePostLoginReturnTo } from "@/lib/return-to";
>>>>>>> origin/main

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const raw =
    (typeof query.returnTo === "string" && query.returnTo) ||
    (typeof query.returnUrl === "string" && query.returnUrl) ||
    null;

<<<<<<< HEAD
=======
  const appOrigin = resolveAppOrigin();
>>>>>>> origin/main
  const returnTo = resolvePostLoginReturnTo(raw);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Nebutra Auth</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-zinc-400">One account for every Nebutra app.</p>
      </div>

<<<<<<< HEAD
      <CredentialsForm mode="sign-up" returnTo={returnTo} />
=======
      <CredentialsForm mode="sign-up" returnTo={returnTo} appOrigin={appOrigin} />
>>>>>>> origin/main

      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          className="text-zinc-200 underline-offset-4 hover:underline"
          href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
