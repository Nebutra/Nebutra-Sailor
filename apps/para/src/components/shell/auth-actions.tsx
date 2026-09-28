"use client";

/**
 * Who is signed in, and the way to the auth center, inside the profile menu.
 *
 * The session is read on the server (shell layout) and passed down. This used to call
 * `useAuth()`, which needs an <AuthProvider> PARA never mounts, so opening the menu threw.
 * PARA has no sign-out route of its own; 切换账号 goes to the auth center, which owns sessions.
 */
export interface ShellAccount {
  /** What to call the account: email, else name. */
  label: string;
  /** Mock mode has no auth; the menu says so instead of offering a sign-in that goes nowhere. */
  demo: boolean;
}

export function AuthActions({
  account,
  switchUrl,
  onNavigate,
}: {
  account: ShellAccount;
  switchUrl: string | null;
  onNavigate?: () => void;
}) {
  const item =
    "flex h-[var(--para-h-control)] w-full items-center rounded-md px-2 text-left text-foreground text-body hover:bg-accent";
  return (
    <>
      <span className="flex h-[var(--para-h-control)] w-full items-center truncate px-2 text-muted-foreground text-label">
        {account.demo ? "演示模式（本地数据）" : account.label}
      </span>
      {switchUrl ? (
        <a className={item} href={switchUrl} onClick={onNavigate}>
          切换账号
        </a>
      ) : null}
    </>
  );
}
