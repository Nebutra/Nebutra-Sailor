import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopBar } from "@/components/shell/app-top-bar";
import pkg from "../../../package.json";

/**
 * The app shell: a persistent left rail and an account bar over the main column. Home, Projects,
 * Assets, a project's overview and Plans live inside it; the workspace canvas does not — like
 * LibTV's canvas, it is full-screen and owns its own chrome.
 *
 * The version is read here, on the server, so the client bundle does not carry package.json.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <AppSidebar version={pkg.version} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main className="mx-auto w-full max-w-para-surface flex-1 px-6 pt-4 pb-24">{children}</main>
      </div>
    </div>
  );
}
