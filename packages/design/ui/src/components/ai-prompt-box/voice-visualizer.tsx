"use client";

import type React from "react";
import { cn } from "../../utils/cn";

export const MAX_VISUALIZER_BARS = 64;
export const VISUALIZER_BAR_STYLES = Array.from({ length: MAX_VISUALIZER_BARS }, (_, index) => ({
  id: `voice-bar-${index}`,
  height: `${15 + ((index * 37) % 86)}%`,
  animationDelay: `${index * 0.05}s`,
  animationDuration: `${0.5 + ((index * 17) % 6) / 10}s`,
}));

export const formatRecordingTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export interface VoiceRecorderProps {
  isRecording: boolean;
  time: number;
  visualizerBars?: number;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  time,
  visualizerBars = 32,
}) => {
  const barStyles = VISUALIZER_BAR_STYLES.slice(
    0,
    Math.min(visualizerBars, VISUALIZER_BAR_STYLES.length),
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formatRecordingTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {barStyles.map((bar) => (
          <div
            key={bar.id}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{
              height: bar.height,
              animationDelay: bar.animationDelay,
              animationDuration: bar.animationDuration,
            }}
          />
        ))}
      </div>
    </div>
  );
};
VoiceRecorder.displayName = "VoiceRecorder";
