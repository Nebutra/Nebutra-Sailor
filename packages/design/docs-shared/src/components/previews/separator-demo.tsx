import { Separator } from "@nebutra/ui/primitives";

export function SeparatorDemo() {
  return (
    <div className="w-80 space-y-4">
      <div>
        <h4 className="text-sm font-medium">Nebutra Design System</h4>
        <p className="text-sm text-muted-foreground">Composable UI for modern apps.</p>
      </div>
      <Separator />
      <div className="h-5 space-x-4 text-sm flex flex-row items-center">
        <span>Blog</span>
        <Separator orientation="vertical" />
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
      </div>
    </div>
  );
}
