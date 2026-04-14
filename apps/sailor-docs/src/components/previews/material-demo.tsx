import { Material } from "@nebutra/ui/primitives";
import { Bell, LogOut, Settings, User } from "lucide-react";

export function MaterialDemo() {
  return (
    <div className="max-w-4xl p-4 md:p-12 md:flex-row gap-8 mx-auto flex min-h-[400px] w-full flex-col items-start rounded-xl bg-secondary/30">
      {/* Card Material */}
      <Material type="card" className="p-6 gap-4 flex w-full flex-1 flex-col">
        <h3 className="font-semibold text-lg">Card Elevation</h3>
        <p className="text-sm w-full text-muted-foreground">
          Used for page sections and standard container surfaces. Has a subtle lift from the
          background.
        </p>
        <div className="h-32 mt-4 flex items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground">
          Content Area
        </div>
      </Material>

      {/* Menu Material */}
      <Material type="menu" className="w-64 py-2 flex flex-shrink-0 flex-col border">
        <div className="px-4 py-3 border-b">
          <h3 className="font-medium text-sm">Menu Elevation</h3>
          <p className="text-xs mt-1 text-muted-foreground">Used for dropdowns</p>
        </div>
        <div className="p-2 space-y-1 flex flex-col">
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm flex w-full items-center rounded-md text-left transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm flex w-full items-center rounded-md text-left transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm flex w-full items-center rounded-md text-left transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <div className="my-1 mx-2 h-px bg-border" />
          <button
            type="button"
            className="gap-3 px-3 py-2 text-sm flex w-full items-center rounded-md text-left text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </Material>

      {/* Modal Material */}
      <div className="space-y-4 lg:block hidden w-full flex-1">
        <div className="text-sm font-medium">Modal Elevation</div>
        <p className="text-xs text-muted-foreground">Used for dialogs and floating focus areas.</p>
        <Material type="modal" className="p-6 relative z-10 w-full border shadow-2xl">
          <div className="space-y-4 w-full">
            <h3 className="font-bold text-lg">Confirm Action</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to proceed with this action? This cannot be undone.
            </p>
            <div className="gap-3 pt-4 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium rounded-md border transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </Material>
      </div>
    </div>
  );
}
