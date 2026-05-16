import { Error as ErrorSurface } from "@nebutra/ui/primitives";

export function ErrorMessageDemo() {
  return (
    <div className="relative w-full max-w-lg px-4 py-8">
      <ErrorSurface title="Couldn’t Load Deployments" errorId="iad1::r7h2p-1712f9cda5d8">
        The deployments list failed to load. Try again or check the request details.
      </ErrorSurface>
    </div>
  );
}
