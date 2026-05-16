"use client";

import { type MotionStyle, motion, type Transition } from "framer-motion";
import * as React from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { type ThemeToggleSize, themeToggleTokens } from "../tokens/components/theme-toggle";
import { cn } from "../utils/cn";

export type ThemeToggleValue = "light" | "dark";

type ThemeToggleStyle = MotionStyle & {
  "--theme-toggle-size"?: string;
  "--theme-toggle-icon-size"?: string;
  "--theme-toggle-padding"?: string;
  "--theme-toggle-radius"?: string;
  "--theme-toggle-duration"?: string;
  "--theme-toggle-easing"?: string;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type NativeButtonProps = Omit<
  React.ComponentPropsWithoutRef<typeof motion.button>,
  "children" | "defaultValue" | "onChange" | "value"
>;

export interface ThemeToggleProps extends NativeButtonProps {
  /** Controlled binary theme value. Use `ThemeSwitcher` when `system` is required. */
  value?: ThemeToggleValue;
  /** Initial binary theme value for uncontrolled usage. Reads the document class on mount when omitted. */
  defaultValue?: ThemeToggleValue;
  /** Fired with the next binary theme value. Integrate with `@nebutra/tokens` or `next-themes`. */
  onChange?: (value: ThemeToggleValue) => void;
  /** Compact icon-button size. */
  size?: ThemeToggleSize;
  /** Optional user-gesture sound. Disabled by default to avoid unexpected audio in SaaS surfaces. */
  sound?: boolean;
  /** Apply `.dark` to `document.documentElement` for standalone demos or non-provider apps. */
  applyToDocument?: boolean;
  /** Action labels. `dark` is announced while the control is in light mode, and vice versa. */
  labels?: Partial<Record<ThemeToggleValue, string>>;
}

const DEFAULT_LABELS = {
  light: "Switch to light theme",
  dark: "Switch to dark theme",
} as const satisfies Record<ThemeToggleValue, string>;

let themeToggleAudioContext: AudioContext | null = null;
let themeToggleAudioBuffer: AudioBuffer | null = null;

function getThemeToggleStyle(
  size: ThemeToggleSize,
  style: MotionStyle | undefined,
): ThemeToggleStyle {
  const token = themeToggleTokens.sizes[size];

  return {
    "--theme-toggle-size": `${token.control}px`,
    "--theme-toggle-icon-size": `${token.icon}px`,
    "--theme-toggle-padding": `${token.padding}px`,
    "--theme-toggle-radius": `${token.radius}px`,
    "--theme-toggle-duration": `${themeToggleTokens.motion.duration}ms`,
    "--theme-toggle-easing": themeToggleTokens.motion.easing,
    ...style,
  };
}

function readDocumentTheme(): ThemeToggleValue {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyDocumentTheme(theme: ThemeToggleValue) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) return null;

  themeToggleAudioContext ??= new AudioContextConstructor();

  if (themeToggleAudioContext.state === "suspended") {
    void themeToggleAudioContext.resume();
  }

  return themeToggleAudioContext;
}

function getAudioBuffer(audioContext: AudioContext) {
  if (themeToggleAudioBuffer?.sampleRate === audioContext.sampleRate) {
    return themeToggleAudioBuffer;
  }

  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * 0.006);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    const progress = index / length;
    const sine = Math.sin(2 * Math.PI * 3400 * progress);
    const noise = Math.random() * 2 - 1;
    channel[index] = (sine * 0.6 + noise * 0.4) * (1 - progress) ** 3;
  }

  themeToggleAudioBuffer = buffer;
  return buffer;
}

function playToggleSound(lastPlayedAt: React.MutableRefObject<number>) {
  const now = performance.now();
  if (now - lastPlayedAt.current < 80) return;
  lastPlayedAt.current = now;

  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();

    source.buffer = getAudioBuffer(audioContext);
    gain.gain.value = 0.08;
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
  } catch {
    // Audio is decorative. Browser/user policy failures must not block theme changes.
  }
}

export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      size = "md",
      sound = false,
      applyToDocument = false,
      labels,
      className,
      style,
      disabled,
      type = "button",
      onClick,
      ...props
    },
    ref,
  ) => {
    const rawId = React.useId();
    const maskId = `theme-toggle-mask-${rawId.replace(/:/g, "")}`;
    const shouldReduceMotion = useReducedMotion();
    const lastSoundAt = React.useRef(0);
    const [mounted, setMounted] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState<ThemeToggleValue>(
      defaultValue ?? "light",
    );

    React.useEffect(() => {
      if (value === undefined && defaultValue === undefined) {
        setInternalValue(readDocumentTheme());
      }
      setMounted(true);
    }, [defaultValue, value]);

    const currentValue = value ?? internalValue;
    const isDark = currentValue === "dark";
    const actionLabel = isDark
      ? (labels?.light ?? DEFAULT_LABELS.light)
      : (labels?.dark ?? DEFAULT_LABELS.dark);
    const transition: Transition =
      shouldReduceMotion || !mounted
        ? themeToggleTokens.motion.instant
        : themeToggleTokens.motion.morph;
    const pressTransition: Transition = shouldReduceMotion
      ? themeToggleTokens.motion.instant
      : themeToggleTokens.motion.press;
    const interactionMotionProps =
      !disabled && !shouldReduceMotion
        ? {
            whileHover: { scale: themeToggleTokens.motion.hoverScale },
            whileTap: { scale: themeToggleTokens.motion.tapScale },
          }
        : {};

    React.useEffect(() => {
      if (applyToDocument && mounted) {
        applyDocumentTheme(currentValue);
      }
    }, [applyToDocument, currentValue, mounted]);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      if (event.defaultPrevented || disabled) return;

      const nextValue: ThemeToggleValue = isDark ? "light" : "dark";

      if (value === undefined) {
        setInternalValue(nextValue);
      }

      if (applyToDocument) {
        applyDocumentTheme(nextValue);
      }

      onChange?.(nextValue);

      if (sound) {
        playToggleSound(lastSoundAt);
      }
    };

    return (
      <motion.button
        {...props}
        {...interactionMotionProps}
        aria-label={actionLabel}
        aria-pressed={isDark}
        className={cn(
          "inline-flex size-[var(--theme-toggle-size)] shrink-0 items-center justify-center rounded-[var(--theme-toggle-radius)] p-[var(--theme-toggle-padding)] text-foreground",
          "transition-[background-color,color,box-shadow] duration-[var(--theme-toggle-duration)] ease-[var(--theme-toggle-easing)]",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          "motion-reduce:transition-none",
          className,
        )}
        disabled={disabled}
        onClick={handleClick}
        ref={ref}
        style={getThemeToggleStyle(size, style)}
        transition={pressTransition}
        type={type}
      >
        <motion.svg
          animate={{ rotate: isDark ? 270 : 0 }}
          aria-hidden="true"
          className="size-[var(--theme-toggle-icon-size)] overflow-visible"
          fill="none"
          initial={false}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={themeToggleTokens.icon.strokeWidth}
          transition={transition}
          viewBox="0 0 24 24"
        >
          <mask id={maskId}>
            <rect fill="white" height="100%" width="100%" x="0" y="0" />
            <motion.circle
              animate={{ cx: isDark ? 17 : 33, cy: isDark ? 8 : 0 }}
              fill="black"
              initial={false}
              r={themeToggleTokens.icon.maskRadius}
              transition={transition}
            />
          </mask>

          <motion.circle
            animate={{
              r: isDark ? themeToggleTokens.icon.moonRadius : themeToggleTokens.icon.sunRadius,
            }}
            cx={themeToggleTokens.icon.center}
            cy={themeToggleTokens.icon.center}
            fill="currentColor"
            initial={false}
            mask={`url(#${maskId})`}
            stroke="none"
            transition={transition}
          />

          <motion.g
            animate={{
              opacity: isDark ? 0 : 1,
              rotate: isDark ? -30 : 0,
              scale: isDark ? 0 : 1,
            }}
            initial={false}
            style={{ transformOrigin: "12px 12px" }}
            transition={transition}
          >
            <line x1="12" x2="12" y1="1" y2="3" />
            <line x1="12" x2="12" y1="21" y2="23" />
            <line x1="1" x2="3" y1="12" y2="12" />
            <line x1="21" x2="23" y1="12" y2="12" />
            <line x1="5.64" x2="4.22" y1="5.64" y2="4.22" />
            <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
            <line x1="5.64" x2="4.22" y1="18.36" y2="19.78" />
            <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
          </motion.g>
        </motion.svg>
      </motion.button>
    );
  },
);

ThemeToggle.displayName = "ThemeToggle";

export const AnimatedThemeToggler = ThemeToggle;
export type AnimatedThemeTogglerProps = ThemeToggleProps;
