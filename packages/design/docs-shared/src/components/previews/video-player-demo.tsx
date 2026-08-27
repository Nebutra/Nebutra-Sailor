import { VideoPlayer } from "@nebutra/ui/primitives";

export function VideoPlayerDemo() {
  return (
    <div className="max-w-4xl px-4 py-8 w-full">
      <VideoPlayer
        src="https://www.w3schools.com/html/mov_bbb.mp4"
        autoPlay={false}
        loop={true}
        className="overflow-hidden rounded-xl border border-border shadow-lg"
      />
    </div>
  );
}
