"use client";

<<<<<<< HEAD
import { useState } from "react";

interface CredentialsFormProps {
  mode: "sign-in" | "sign-up";
  /** Already-sanitized absolute return URL (computed on the server). */
  returnTo: string;
}

export function CredentialsForm({ mode, returnTo }: CredentialsFormProps) {
=======
import { getAuthReturnAllowedHosts, sanitizeReturnUrl } from "@nebutra/auth";
import { useMemo, useState } from "react";

interface CredentialsFormProps {
  mode: "sign-in" | "sign-up";
  returnTo?: string;
  appOrigin: string;
}

export function CredentialsForm({ mode, returnTo, appOrigin }: CredentialsFormProps) {
>>>>>>> origin/main
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

<<<<<<< HEAD
=======
  const safeReturn = useMemo(() => {
    const allowed = getAuthReturnAllowedHosts();
    const fallback = `${appOrigin.replace(/\/$/, "")}/dashboard`;
    if (!returnTo) return fallback;
    if (returnTo.startsWith("/")) {
      return `${appOrigin.replace(/\/$/, "")}${returnTo}`;
    }
    return sanitizeReturnUrl(returnTo, { allowedHosts: allowed, fallback });
  }, [returnTo, appOrigin]);

>>>>>>> origin/main
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "sign-in" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
      const body =
        mode === "sign-in"
<<<<<<< HEAD
          ? { email, password, callbackURL: returnTo }
          : { email, password, name: name || email.split("@")[0], callbackURL: returnTo };
=======
          ? { email, password, callbackURL: safeReturn }
          : { email, password, name: name || email.split("@")[0], callbackURL: safeReturn };
>>>>>>> origin/main

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message || (mode === "sign-in" ? "Sign in failed" : "Sign up failed"));
        return;
      }

<<<<<<< HEAD
      window.location.assign(returnTo);
=======
      window.location.assign(safeReturn);
>>>>>>> origin/main
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
      {mode === "sign-up" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Name</span>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Email</span>
        <input
          required
          type="email"
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Password</span>
        <input
          required
          type="password"
          minLength={8}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
