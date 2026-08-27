/**
 * @nebutra/video-compose — the video-pipeline assembly gap.
 *
 * `composeTimeline` is pure (an edit-decision list: ordered segments +
 * crossfade math + total duration) so the assembly logic is unit-testable
 * with no ffmpeg binary. The `VideoCompositor` that actually renders is a
 * provider abstraction: a deterministic zero-config mock is the active
 * default; a real ffmpeg adapter is selected via the shared provider pattern
 * and fails loud until landed (stub lifecycle).
 */

import { CapabilityError } from "@nebutra/capability-kit";
import { resolveProviderType } from "@nebutra/provider-factory";

export class VideoComposeError extends CapabilityError {
  constructor(message: string, init: { code: string; suggestion: string; cause?: unknown }) {
    super(message, init, {
      name: "VideoComposeError",
      emptySuggestionFallback:
        "No suggestion was provided. This is a bug in @nebutra/video-compose — report it.",
    });
  }
}

export interface Clip {
  readonly uri: string;
  readonly durationSec: number;
}

export interface TimelineSegment {
  readonly uri: string;
  readonly startSec: number;
  readonly durationSec: number;
  /** Crossfade-in length from the previous segment (0 for the first). */
  readonly transitionInSec: number;
}

export interface Timeline {
  readonly segments: readonly TimelineSegment[];
  readonly totalDurationSec: number;
}

export interface ComposeOptions {
  /** Crossfade overlap between adjacent clips; must be < shortest clip. */
  readonly crossfadeSec?: number;
}

/** Build the edit-decision list. Pure; no I/O. */
export function composeTimeline(clips: readonly Clip[], opts: ComposeOptions = {}): Timeline {
  if (clips.length === 0) {
    throw new VideoComposeError("Cannot compose a timeline from zero clips.", {
      code: "VC_NO_CLIPS",
      suggestion: "Pass at least one rendered clip.",
    });
  }
  const cf = opts.crossfadeSec ?? 0;
  if (cf < 0) {
    throw new VideoComposeError("crossfadeSec must be non-negative.", {
      code: "VC_BAD_CROSSFADE",
      suggestion: "Use a crossfade ≥ 0 and strictly shorter than the shortest clip.",
    });
  }
  const shortest = Math.min(...clips.map((c) => c.durationSec));
  if (cf > 0 && cf >= shortest) {
    throw new VideoComposeError(
      `crossfadeSec (${cf}) must be shorter than the shortest clip (${shortest}).`,
      {
        code: "VC_CROSSFADE_TOO_LONG",
        suggestion: "Reduce the crossfade or remove clips shorter than it.",
      },
    );
  }

  const segments: TimelineSegment[] = [];
  let cursor = 0;
  clips.forEach((clip, i) => {
    const transitionInSec = i === 0 ? 0 : cf;
    const startSec = i === 0 ? 0 : cursor - cf;
    segments.push({ uri: clip.uri, startSec, durationSec: clip.durationSec, transitionInSec });
    cursor = startSec + clip.durationSec;
  });

  return { segments, totalDurationSec: cursor };
}

export type VideoComposeProviderType = "mock" | "ffmpeg";

export interface VideoCompositor {
  readonly name: VideoComposeProviderType;
  render(timeline: Timeline): Promise<{ uri: string; durationSec: number }>;
  health(): Promise<{ ok: boolean; detail: string }>;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Deterministic zero-config compositor (no ffmpeg). */
export class MockCompositor implements VideoCompositor {
  readonly name = "mock" as const;

  async render(timeline: Timeline): Promise<{ uri: string; durationSec: number }> {
    const sig = hash(
      timeline.segments.map((s) => `${s.uri}@${s.startSec}+${s.transitionInSec}`).join("|"),
    );
    return {
      uri: `data:video/x-nebutra-mock;base64,${Buffer.from(sig).toString("base64")}`,
      durationSec: timeline.totalDurationSec,
    };
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: "mock compositor: deterministic, zero-config" };
  }
}

export interface VideoComposeConfig {
  readonly provider?: VideoComposeProviderType;
}

/** Resolve a compositor. Zero-config → mock; ffmpeg is a fail-loud stub. */
export async function getVideoCompose(config?: VideoComposeConfig): Promise<VideoCompositor> {
  const type = resolveProviderType<VideoComposeProviderType>({
    explicit: config?.provider,
    envVarName: "VIDEO_COMPOSE_PROVIDER",
    detectors: [],
    fallback: "mock",
  });
  if (type === "mock") return new MockCompositor();
  throw new VideoComposeError(`The "${type}" compositor is not implemented yet.`, {
    code: "VC_PROVIDER_UNIMPLEMENTED",
    suggestion:
      "Implement the ffmpeg adapter (render via fluent-ffmpeg/child_process + " +
      "health) and register it here, or use the zero-config mock compositor.",
  });
}
