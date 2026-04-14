"use client";

import { Building2, Home, Settings, Users } from "lucide-react";

export function SidebarDemo() {
  return (
    <div className="flex h-[400px] w-full overflow-hidden rounded-xl border bg-background">
      {/* Mock Sidebar */}
      <div className="w-64 flex h-full flex-col border-r bg-muted/30">
        <div className="p-4 gap-2 flex items-center border-b">
          <div className="w-6 h-6 rounded font-bold text-xs flex items-center justify-center bg-primary text-primary-foreground">
            N
          </div>
          <span className="font-semibold text-sm">Nebutra App</span>
        </div>

        <div className="p-3 space-y-1 flex-1">
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm font-medium flex w-full items-center rounded-md bg-secondary text-secondary-foreground"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm font-medium flex w-full items-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
          >
            <Users className="w-4 h-4" />
            Team
          </button>
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm font-medium flex w-full items-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
          >
            <Building2 className="w-4 h-4" />
            Projects
          </button>
        </div>

        <div className="p-3 border-t">
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm font-medium flex w-full items-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex-1 bg-muted/10">
        <div className="h-8 w-48 mb-6 animate-pulse rounded-md bg-muted" />
        <div className="gap-4 mb-6 grid grid-cols-3">
          <div className="h-24 rounded-lg border bg-card shadow-sm" />
          <div className="h-24 rounded-lg border bg-card shadow-sm" />
          <div className="h-24 rounded-lg border bg-card shadow-sm" />
        </div>
        <div className="h-48 animate-pulse w-full rounded-lg border bg-card shadow-sm" />
      </div>
    </div>
  );
}
