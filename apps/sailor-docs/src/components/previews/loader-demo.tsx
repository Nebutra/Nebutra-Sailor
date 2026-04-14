import { Loader } from "@nebutra/ui/primitives";

export function LoaderDemo() {
  return (
    <div className="max-w-sm px-4 py-8 space-x-4 flex w-full items-center justify-center">
      <Loader />
      <Loader variant="dots" size="lg" />
      <Loader variant="loading-dots" text="Processing" />
    </div>
  );
}
