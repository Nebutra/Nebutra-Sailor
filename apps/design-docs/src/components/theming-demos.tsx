"use client";

export function ThemeColorsDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-xl border border-fd-border overflow-hidden dark:hidden bg-slate-50 text-slate-900">
        <div className="p-4 bg-slate-200 border-b border-slate-300 font-medium text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-slate-900"></div> Light Mode (Primer Defaults)
          </span>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-blue-600 shadow-sm"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">accent.fg</span>
                <span className="text-xs text-slate-500">Primary buttons, active links</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-slate-100 border border-slate-200 shadow-sm"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">canvas.default</span>
                <span className="text-xs text-slate-500">Page backgrounds</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-white border border-slate-200 shadow-sm"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">canvas.overlay</span>
                <span className="text-xs text-slate-500">Cards, dropdowns, modals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-fd-border overflow-hidden hidden dark:flex bg-[#0d1117] text-[#c9d1d9]">
        <div className="p-4 bg-[#161b22] border-b border-[#30363d] font-medium text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-white"></div> Dark Mode (Primer Defaults)
          </span>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-blue-500 shadow-sm"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">accent.fg</span>
                <span className="text-xs text-[#8b949e]">Primary buttons, active links</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-[#0d1117] border border-[#30363d] shadow-sm"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">canvas.default</span>
                <span className="text-xs text-[#8b949e]">Page backgrounds</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-[#161b22] border border-[#30363d] shadow-sm"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">canvas.overlay</span>
                <span className="text-xs text-[#8b949e]">Cards, dropdowns, modals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="md:col-span-2 text-sm text-center text-fd-muted-foreground mt-2">
        Toggle your system or docs theme to see the active view.
      </p>
    </div>
  );
}
