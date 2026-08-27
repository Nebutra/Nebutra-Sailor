import { Spinner } from "@nebutra/ui/primitives";

export function SpinnerDemo() {
  return (
    <div className="flex w-full max-w-sm items-center justify-center gap-8 px-4 py-8">
      <Spinner />
      <Spinner size="sm" />
      <Spinner size="lg" tone="foreground" />
    </div>
  );
}
