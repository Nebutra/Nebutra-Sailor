import { buildAuthCenterSignInUrl, getAuthCenterOrigin } from "@nebutra/auth/client";
import { Button, Field, Input } from "@nebutra/ui/primitives";
import { createRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import {
  DEMO_ACCOUNT,
  describeError,
  hasDemoAccount,
  postAuth,
  signInWithDemoAccount,
} from "@/vite-app/preview-auth";
import { rootRoute } from "./__root";

/**
 * Where sign-in happens.
 *
 * A deployment with a separate auth center names it in VITE_AUTH_URL (on a
 * first-party production host @nebutra/auth forces it regardless), and the
 * app hands sign-in over to it. Without one — every fresh project and every
 * local preview — the auth center is the app's own origin: Better Auth answers
 * on /api/auth through the gateway, and this page signs in there.
 */
function resolveExternalAuthCenter(): string | null {
  const appOrigin = window.location.origin;
  const center = getAuthCenterOrigin(
    { NEXT_PUBLIC_AUTH_URL: import.meta.env.VITE_AUTH_URL },
    appOrigin,
  );
  return center === appOrigin ? null : center;
}

type Mode = "sign-in" | "sign-up";

function authenticate(mode: Mode, email: string, password: string, name: string) {
  return mode === "sign-up"
    ? postAuth("sign-up/email", { email, password, name: name || email.split("@")[0] || email })
    : postAuth("sign-in/email", { email, password });
}

function SignInForm() {
  // /sign-in?mode=sign-up opens on the sign-up form (the welcome page links there).
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get("mode") === "sign-up" ? "sign-up" : "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A full load lets the session provider read the new cookie.
  const finish = () => window.location.assign("/welcome");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const failure = await authenticate(mode, email, password, name).catch(describeError);
    setPending(false);
    if (failure) setError(failure);
    else finish();
  };

  const continueWithDemoAccount = async () => {
    setPending(true);
    setError(null);
    const failure = await signInWithDemoAccount();
    setPending(false);
    if (failure) setError(failure);
    else finish();
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-1 px-6 text-neutral-12">
      <section className="w-full max-w-sm rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-6">
        <h1 className="text-2xl font-semibold">
          {mode === "sign-in" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-neutral-11">
          Accounts live in this project&apos;s own database.
        </p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {mode === "sign-up" ? (
            <Field label="Name" htmlFor="name">
              <Input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive-strong">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <Button
          type="button"
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Create an account instead" : "Sign in to an existing account"}
        </Button>
        {hasDemoAccount() ? (
          <div className="mt-6 border-neutral-7 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void continueWithDemoAccount()}
            >
              Continue with the demo account
            </Button>
            <p className="mt-2 text-xs text-neutral-10">
              Local preview database: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SignInRoute() {
  const [externalCenter] = useState(resolveExternalAuthCenter);

  useEffect(() => {
    if (!externalCenter) return;
    const returnTo = `${window.location.origin}/workspace`;
    window.location.replace(
      buildAuthCenterSignInUrl(returnTo, { NEXT_PUBLIC_AUTH_URL: externalCenter }),
    );
  }, [externalCenter]);

  if (externalCenter) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-neutral-1 px-6 text-neutral-12">
        <p className="text-sm text-neutral-11">Redirecting to sign in…</p>
      </main>
    );
  }
  return <SignInForm />;
}

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInRoute,
});
