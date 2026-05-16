import { Kbd } from "@nebutra/ui/primitives";

export function KbdDemo() {
  return (
    <div className="flex items-center gap-2">
      <Kbd meta />
      <Kbd shift />
      <Kbd alt />
      <Kbd ctrl />
      <Kbd meta shift />
      <Kbd small>/</Kbd>
    </div>
  );
}
