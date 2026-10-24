import type { ReactNode } from "react";

/** Centered card for setup and sign-in. */
export function AuthFrame({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold tracking-tight text-foreground">Nebutra Status</p>
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
