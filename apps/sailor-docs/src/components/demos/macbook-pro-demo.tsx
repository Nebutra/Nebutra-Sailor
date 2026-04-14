import { MacbookPro } from "@nebutra/ui/primitives";

export function MacbookProDemo() {
  return (
    <div className="relative w-full max-w-4xl mx-auto flex items-center justify-center p-8">
      <MacbookPro
        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop"
        className="w-full h-auto"
      />
    </div>
  );
}
