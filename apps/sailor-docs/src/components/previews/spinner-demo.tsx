import { Spinner } from "@nebutra/ui/primitives";

export function SpinnerDemo() {
  return (
    <div className="max-w-sm px-4 py-8 space-x-4 flex w-full items-center justify-center">
      <Spinner />
      <Spinner variant="ring" size={32} />
      <Spinner variant="infinite" className="text-primary" />
    </div>
  );
}
