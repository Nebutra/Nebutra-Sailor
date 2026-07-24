import { VideoText } from "@nebutra/ui/primitives";

export function VideoTextDemo() {
  return (
    <div className="max-w-4xl px-4 py-8 h-[300px] w-full">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
        <VideoText
          src="https://www.w3schools.com/html/mov_bbb.mp4"
          fontSize="24vw"
          fontWeight={900}
        >
          NEBUTRA
        </VideoText>
      </div>
    </div>
  );
}
