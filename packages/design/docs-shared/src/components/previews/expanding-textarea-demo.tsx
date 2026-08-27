import { ExpandingTextarea } from "@nebutra/ui/primitives";

export function ExpandingTextareaDemo() {
  return (
    <div className="max-w-md px-4 py-12 flex w-full items-center justify-center">
      <ExpandingTextarea
        placeholder="Start typing... the textarea will expand automatically."
        className="w-full"
      />
    </div>
  );
}
