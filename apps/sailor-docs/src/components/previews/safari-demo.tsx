import { Safari } from "@nebutra/ui/primitives";

export function SafariDemo() {
  return (
    <div className="max-w-4xl px-4 py-8 w-full">
      <Safari
        url="nebutra.dev"
        className="h-[400px] w-full"
        imageSrc="https://nebutra.com/og-image.png"
      />
    </div>
  );
}
