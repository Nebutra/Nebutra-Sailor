"use client";

import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { cn } from "../utils";
import { Button } from "./button";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for VideoPlayer component
 *
 * @description
 * A custom video player with animated controls, volume slider, progress bar,
 * and playback speed options. Controls auto-hide on mouse leave.
 *
 * **UX Scenarios:**
 * - Product demo videos
 * - Course/tutorial content
 * - Marketing video showcases
 * - Portfolio video presentations
 * - Onboarding video guides
 *
 * **Features:**
 * - Play/pause with click on video
 * - Animated progress and volume sliders
 * - Playback speed selection (0.5x - 2x)
 * - Auto-hiding controls on mouse leave
 * - Mute toggle with volume memory
 */
export interface VideoPlayerProps {
  /** Video source URL */
  src: string;
  /** Poster image URL */
  poster?: string;
  /** Additional CSS classes for container */
  className?: string;
  /** Whether to autoplay (muted required for autoplay) */
  autoPlay?: boolean;
  /** Whether to loop the video */
  loop?: boolean;
  /** Available playback speeds */
  speeds?: number[];
  /** Initial volume (0-1) */
  initialVolume?: number;
  /** Whether to show controls initially */
  showControlsOnMount?: boolean;
}

/**
 * Props for CustomSlider sub-component
 */
interface CustomSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// =============================================================================
// Sub-components
// =============================================================================

/**
 * CustomSlider - Animated progress/volume slider
 */
const CustomSlider: React.FC<CustomSliderProps> = ({ value, onChange, className }) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    onChange(Math.min(Math.max(percentage, 0), 100));
  };

  return (
    <motion.div
      className={cn("relative h-1 w-full cursor-pointer rounded-full bg-white/20", className)}
      onClick={handleClick}
    >
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full bg-white"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * VideoPlayer - Custom video player with animated controls
 *
 * @example
 * ```tsx
 * // Basic usage
 * <VideoPlayer src="/demo.mp4" />
 *
 * // With poster and custom speeds
 * <VideoPlayer
 *   src="/tutorial.mp4"
 *   poster="/thumbnail.jpg"
 *   speeds={[0.5, 1, 1.25, 1.5, 2]}
 *   initialVolume={0.8}
 * />
 *
 * // Autoplay (muted)
 * <VideoPlayer
 *   src="/background.mp4"
 *   autoPlay
 *   loop
 * />
 * ```
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className,
  autoPlay = false,
  loop = false,
  speeds = [0.5, 1, 1.5, 2],
  initialVolume = 1,
  showControlsOnMount = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(initialVolume);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(autoPlay); // Autoplay requires muted
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(showControlsOnMount);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((value: number) => {
    if (videoRef.current) {
      const newVolume = value / 100;
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const progressValue = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(Number.isFinite(progressValue) ? progressValue : 0);
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((value: number) => {
    if (videoRef.current?.duration) {
      const time = (value / 100) * videoRef.current.duration;
      if (Number.isFinite(time)) {
        videoRef.current.currentTime = time;
        setProgress(value);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  }, [isMuted]);

  const setSpeed = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  }, []);

  const VolumeIcon = isMuted ? VolumeX : volume > 0.5 ? Volume2 : Volume1;

  return (
    <motion.div
      className={cn(
        "relative mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--radius-xl)] bg-black/60 shadow-lg backdrop-blur-sm",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="w-full"
        onTimeUpdate={handleTimeUpdate}
        src={src}
        poster={poster}
        onClick={togglePlay}
        autoPlay={autoPlay}
        muted={autoPlay || isMuted}
        loop={loop}
        playsInline
      />

      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 m-2 mx-auto max-w-xl rounded-[var(--radius-2xl)] bg-black/60 p-4 backdrop-blur-md"
            initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Progress bar */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm text-white">{formatTime(currentTime)}</span>
              <CustomSlider value={progress} onChange={handleSeek} className="flex-1" />
              <span className="text-sm text-white">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    onClick={togglePlay}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 hover:text-white"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                </motion.div>

                {/* Volume */}
                <div className="flex items-center gap-x-1">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/10 hover:text-white"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      <VolumeIcon className="h-5 w-5" />
                    </Button>
                  </motion.div>
                  <div className="w-24">
                    <CustomSlider value={volume * 100} onChange={handleVolumeChange} />
                  </div>
                </div>
              </div>

              {/* Playback speed */}
              <div className="flex items-center gap-1">
                {speeds.map((speed) => (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} key={speed}>
                    <Button
                      onClick={() => setSpeed(speed)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-white hover:bg-white/10 hover:text-white",
                        playbackSpeed === speed && "bg-white/20",
                      )}
                      aria-label={`${speed}x speed`}
                    >
                      {speed}x
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;
