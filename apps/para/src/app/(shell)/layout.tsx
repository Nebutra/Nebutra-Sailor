import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopBar } from "@/components/shell/app-top-bar";
import type { ShellAccount } from "@/components/shell/auth-actions";
import { PromoStrip } from "@/components/shell/promo-strip";
import { getServerSession } from "@/lib/auth";
import { paraSignInUrl } from "@/lib/auth-urls";
import pkg from "../../../package.json";

/**
 * The app shell, in LibTV's frame: an offer strip across the top, a persistent left rail, and an
 * account bar over the main column. Home, 项目, 资产, a project's overview and 会员 live inside it;
 * the workspace canvas does not — like LibTV's canvas, it is full-screen and owns its own chrome.
 *
 * The version is read here, on the server, so the client bundle does not carry package.json. So is
 * the session: in gateway mode a request with none gets 注册 / 登录 in place of the avatar. Mock
 * mode has no auth at all and always shows the avatar.
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const gateway = Boolean(process.env.NEXT_PUBLIC_PARA_API_URL);
  const session = gateway ? await getServerSession() : null;
  const account: ShellAccount | null = !gateway
    ? { label: "演示账户", demo: true }
    : session
      ? { label: session.email ?? "已登录", demo: false }
      : null;
  const signInUrl = gateway ? paraSignInUrl("/") : null;

  return (
    // A fixed-height frame: the strip takes what it needs, the rail keeps the rest of the viewport,
    // and only the main column scrolls — so the rail's foot is never pushed below the fold.
    <div className="flex h-dvh flex-col overflow-hidden">
      <PromoStrip />
      <div className="flex min-h-0 flex-1">
        <AppSidebar version={pkg.version} />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <AppTopBar account={account} signInUrl={signInUrl} />
          <main className="mx-auto w-full max-w-para-surface flex-1 px-6 pt-2 pb-24 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
