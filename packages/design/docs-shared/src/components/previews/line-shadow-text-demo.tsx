import { LineShadowText } from "@nebutra/ui/primitives";

export default function LineShadowTextDemo() {
  return (
    <div className="gap-8 bg-zinc-950 flex h-[300px] flex-col items-center justify-center">
      <LineShadowText
        as="h2"
        shadowColor="#3b82f6"
        className="text-6xl font-black text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Blue Shadow
      </LineShadowText>
      <LineShadowText
        as="h2"
        shadowColor="#a855f7"
        className="text-6xl font-black text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Purple Effect
      </LineShadowText>
    </div>
  );
}
