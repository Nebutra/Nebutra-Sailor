import { TextLoop } from "@nebutra/ui/primitives";

export default function TextLoopDemo() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <p className="text-2xl">
        Built for{" "}
        <TextLoop interval={1.5} className="font-bold text-primary">
          {["speed", "scale", "simplicity"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </TextLoop>
      </p>
    </div>
  );
}
