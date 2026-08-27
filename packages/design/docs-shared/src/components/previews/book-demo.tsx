import { Book } from "@nebutra/ui/primitives";

export function BookDemo() {
  return (
    <div className="md:flex-row gap-12 p-8 flex w-full flex-col items-center justify-center">
      {/* 3D Book with Texture */}
      <Book
        title="Frontend Engineering"
        color="#3b82f6"
        textColor="#ffffff"
        textured={true}
        width={{ sm: 140, md: 180 }}
      />

      {/* Simple Flat Book */}
      <Book
        title="CSS Mastery"
        color="#10b981" /* emerald-500 */
        textColor="#ffffff"
        variant="simple"
        width={{ sm: 140, md: 180 }}
      />

      {/* Book with Illustration */}
      <Book
        title="Design Systems"
        color="#f97316" /* orange-500 */
        textColor="#ffffff"
        textured={true}
        illustration={
          <div className="from-orange-400 to-red-500 flex h-full w-full items-center justify-center bg-gradient-to-br">
            <div className="w-16 h-16 border-white/30 border-t-white animate-spin rounded-full border-4" />
          </div>
        }
        width={{ sm: 140, md: 180 }}
      />
    </div>
  );
}
