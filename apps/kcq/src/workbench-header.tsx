/** Account and workspace navigation inside the canonical chart toolbar. */
import type { BrowserAuthContext } from "@nebutra/auth/browser";
import { ArrowUpRight, Check, ChevronDown, GridSquare, User } from "@nebutra/icons";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives/canonical";

export interface WorkbenchHeaderProps {
  context: BrowserAuthContext | null;
  busy: boolean;
  signInUrl: string;
  onSwitch: (id: string | null) => Promise<void>;
  onSignOut: () => Promise<void>;
}
export function WorkbenchHeader({
  context,
  busy,
  signInUrl,
  onSwitch,
  onSignOut,
}: WorkbenchHeaderProps) {
  const active = context?.workspaces.find(
    (workspace) => workspace.id === context.activeWorkspaceId,
  );
  return (
    <nav className="workbench-navigation" aria-label="账户与工作区">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="account-trigger"
          aria-label="账户与工作区菜单"
          disabled={busy}
        >
          {context ? (
            <Avatar size={24} src={context.user.image ?? undefined} title={context.user.name} />
          ) : (
            <span className="guest-avatar">
              <User aria-hidden="true" />
            </span>
          )}
          <span className="workspace-name">
            {context ? (active?.name ?? "个人工作区") : "工作区"}
          </span>
          <ChevronDown className="account-chevron" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="kcq-menu w-64">
          {context ? (
            <>
              <div className="account-identity">
                <strong>{context.user.name}</strong>
                <span>{context.user.email}</span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={busy} onClick={() => void onSwitch(null)}>
                <User />
                个人工作区
                {!active && <Check className="ml-auto" />}
              </DropdownMenuItem>
              {context.workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  disabled={busy}
                  onClick={() => void onSwitch(workspace.id)}
                >
                  <GridSquare />
                  <span className="truncate">{workspace.name}</span>
                  {workspace.id === context.activeWorkspaceId && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <a href="/settings/profile">
                    <User />
                    账户设置
                    <ArrowUpRight className="ml-auto" />
                  </a>
                }
              />
              <DropdownMenuItem disabled={busy} onClick={() => void onSignOut()}>
                退出登录
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              render={
                <a href={signInUrl}>
                  <User />
                  登录 Nebutra
                  <ArrowUpRight className="ml-auto" />
                </a>
              }
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
