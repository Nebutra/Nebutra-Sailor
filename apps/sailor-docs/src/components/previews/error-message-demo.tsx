import { ErrorMessage } from "@nebutra/ui/primitives";

export function ErrorMessageDemo() {
  return (
    <div className="max-w-sm px-4 py-8 relative w-full">
      <ErrorMessage>This email address is already in use.</ErrorMessage>
    </div>
  );
}
