"use client";

import { BlendMode as Palette } from "@nebutra/icons";
import { Badge, Button } from "@nebutra/ui/primitives";

export function BrandOverridesDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-xl border border-fd-border overflow-hidden bg-slate-50 text-slate-900 border-dashed opacity-50">
        <div className="p-4 bg-slate-200 border-b border-slate-300 font-medium text-sm flex items-center justify-between">
          <span>Default Primer Theme</span>
        </div>
        <div className="p-8 flex items-center justify-center h-full min-h-[220px]">
          <Button
            variant="default"
            className="rounded-md bg-blue-600 hover:bg-blue-700 h-10 px-4 shadow-sm"
          >
            Create Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col rounded-xl border-2 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)] overflow-hidden bg-white text-slate-900 relative">
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 font-medium text-sm text-indigo-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Palette className="size-4 text-indigo-500" /> With Brand Overrides
          </span>
          <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-white shadow-sm">
            Active
          </Badge>
        </div>
        <div className="p-8 flex items-center justify-center h-full min-h-[220px] relative">
          <div className="absolute top-4 left-4 right-4 flex justify-between text-xs text-indigo-400 font-mono">
            <span>radius: '16px'</span>
            <span>accent: '#4f46e5'</span>
          </div>
          <Button
            variant="default"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 px-6 shadow-md transition-colors"
          >
            Create Project
          </Button>
          <div className="absolute bottom-4 inset-x-4 flex justify-center text-xs text-indigo-400 font-mono">
            <span>shadows.brand</span>
          </div>
        </div>
      </div>
    </div>
  );
}
