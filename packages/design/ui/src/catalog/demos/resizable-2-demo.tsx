"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@nebutra/ui/primitives";
export function Resizable2Demo() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="max-w-3xl h-[300px] w-full rounded-lg border"
    >
      <ResizablePanel defaultSize={20} minSize={15}>
        <div className="p-6 flex h-full items-center justify-center bg-muted/20">
          <span className="font-semibold">Sidebar</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60}>
        <div className="p-6 flex h-full items-center justify-center bg-background">
          <span className="font-semibold text-lg max-w-[200px] text-center">Main Content Area</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={20} minSize={15}>
        <div className="p-6 flex h-full items-center justify-center bg-muted/20">
          <span className="font-semibold">Right Panel</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
