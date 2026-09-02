import { LoadingState } from "@nebutra/ui/layout";

export default function TenantsLoading() {
  return (
    <div className="flex min-h-[min(32rem,70svh)] w-full items-center justify-center px-6 py-16">
      <LoadingState />
    </div>
  );
}
