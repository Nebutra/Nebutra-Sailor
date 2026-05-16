"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { type PhoneChrome, phoneTokens } from "../tokens/components/phone";
import { cn } from "../utils/cn";

type PhoneFit = "cover" | "contain";

type PhoneBaseProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /**
   * Optional origin shown when the phone has no captured media. Use a host or
   * product surface, not prose.
   */
  address?: string;
  /** Chrome finish. Keep this tied to the surrounding theme. */
  chrome?: PhoneChrome;
  /** CSS object-fit for captured image or video media. */
  fit?: PhoneFit;
  /** CSS object-position for captured media. */
  position?: CSSProperties["objectPosition"];
};

type PhoneEmptyProps = PhoneBaseProps & {
  children?: never;
  imageSrc?: never;
  imageAlt?: never;
  src?: never;
  videoSrc?: never;
  videoPoster?: never;
  videoLabel?: never;
};

type PhoneChildrenProps = PhoneBaseProps & {
  children: ReactNode;
  imageSrc?: never;
  imageAlt?: never;
  src?: never;
  videoSrc?: never;
  videoPoster?: never;
  videoLabel?: never;
};

type PhoneImageProps = PhoneBaseProps & {
  children?: never;
  imageSrc: string;
  imageAlt: string;
  src?: never;
  videoSrc?: never;
  videoPoster?: never;
  videoLabel?: never;
};

type PhoneLegacyImageProps = PhoneBaseProps & {
  children?: never;
  /** @deprecated Use `imageSrc` with required `imageAlt`. */
  src: string;
  imageAlt: string;
  imageSrc?: never;
  videoSrc?: never;
  videoPoster?: never;
  videoLabel?: never;
};

type PhoneVideoProps = PhoneBaseProps & {
  children?: never;
  imageSrc?: never;
  imageAlt?: never;
  src?: never;
  videoSrc: string;
  videoLabel: string;
  /**
   * Poster shown before load and under `prefers-reduced-motion`. Required in
   * product use even though the prop stays optional for legacy callers.
   */
  videoPoster?: string;
};

export type PhoneProps =
  | PhoneEmptyProps
  | PhoneChildrenProps
  | PhoneImageProps
  | PhoneLegacyImageProps
  | PhoneVideoProps;

/** @deprecated Use `PhoneProps` instead. */
export type IphoneMockupProps = PhoneProps;

type PhoneStyle = CSSProperties & {
  "--phone-frame": string;
  "--phone-frame-muted": string;
  "--phone-glass": string;
  "--phone-cutout": string;
  "--phone-screen": string;
  "--phone-shadow": string;
  "--phone-screen-left": string;
  "--phone-screen-top": string;
  "--phone-screen-width": string;
  "--phone-screen-height": string;
  "--phone-screen-radius": string;
  "--phone-fallback-padding": string;
  "--phone-fallback-size": string;
  "--phone-fallback-weight": number;
};

const { viewport } = phoneTokens;
const { screen } = viewport;

const screenStyle = {
  left: "var(--phone-screen-left)",
  top: "var(--phone-screen-top)",
  width: "var(--phone-screen-width)",
  height: "var(--phone-screen-height)",
  borderRadius: "var(--phone-screen-radius)",
} satisfies CSSProperties;

const screenPath = `M${screen.x} 75C${screen.x} 44.21 46.21 ${screen.y} 77 ${screen.y}H355C385.79 ${screen.y} 410.75 44.21 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.21 862.75 ${screen.x} 837.79 ${screen.x} 807V75Z`;

/**
 * Phone — device chrome for captured mobile screens.
 *
 * Use this around screenshots, posters, or videos in marketing and docs. The
 * chrome is decorative; accessible naming belongs to the captured media.
 */
export function Phone(props: PhoneProps) {
  const {
    address,
    chrome = "graphite",
    className,
    style,
    fit = "cover",
    position = "top",
    children,
    imageSrc,
    imageAlt,
    src,
    videoSrc,
    videoPoster,
    videoLabel,
    ...rest
  } = props as PhoneBaseProps & {
    children?: ReactNode;
    imageSrc?: string;
    imageAlt?: string;
    src?: string;
    videoSrc?: string;
    videoPoster?: string;
    videoLabel?: string;
  };

  const chromeTokens = phoneTokens.chrome[chrome];
  const resolvedImageSrc = imageSrc ?? src;
  const hasCapturedMedia = Boolean(children ?? resolvedImageSrc ?? videoSrc);
  const screenPunchId = `phone-screen-punch-${useId().replace(/:/g, "")}`;

  const rootStyle: PhoneStyle = {
    "--phone-frame": chromeTokens.frame,
    "--phone-frame-muted": chromeTokens.frameMuted,
    "--phone-glass": chromeTokens.glass,
    "--phone-cutout": chromeTokens.cutout,
    "--phone-screen": chromeTokens.screen,
    "--phone-shadow": phoneTokens.shadow,
    "--phone-screen-left": `${(screen.x / viewport.width) * 100}%`,
    "--phone-screen-top": `${(screen.y / viewport.height) * 100}%`,
    "--phone-screen-width": `${(screen.width / viewport.width) * 100}%`,
    "--phone-screen-height": `${(screen.height / viewport.height) * 100}%`,
    "--phone-screen-radius": `${screen.radius}px`,
    "--phone-fallback-padding": `${phoneTokens.fallback.padding}px`,
    "--phone-fallback-size": `${phoneTokens.fallback.fontSize}px`,
    "--phone-fallback-weight": phoneTokens.fallback.fontWeight,
    aspectRatio: `${viewport.width} / ${viewport.height}`,
    ...style,
  };

  return (
    <div
      className={cn(
        "relative inline-block w-full align-middle leading-none [filter:drop-shadow(var(--phone-shadow))]",
        className,
      )}
      style={rootStyle}
      {...rest}
    >
      <div
        className="pointer-events-none absolute z-0 overflow-hidden bg-[var(--phone-screen)]"
        style={screenStyle}
      >
        {children ??
          (videoSrc ? (
            <>
              <video
                aria-label={videoLabel}
                className="block size-full object-cover motion-reduce:hidden"
                src={videoSrc}
                poster={videoPoster}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                style={{ objectFit: fit, objectPosition: position }}
              />
              {videoPoster ? (
                // biome-ignore lint/performance/noImgElement: fallback is tied to motion preference, not a Next route image
                <img
                  src={videoPoster}
                  alt=""
                  aria-hidden="true"
                  className="hidden size-full object-cover motion-reduce:block"
                  style={{ objectFit: fit, objectPosition: position }}
                />
              ) : null}
            </>
          ) : resolvedImageSrc ? (
            // biome-ignore lint/performance/noImgElement: framework-neutral primitive — consumers may not use Next.js
            <img
              src={resolvedImageSrc}
              alt={imageAlt ?? ""}
              decoding="async"
              loading="lazy"
              className="block size-full object-cover"
              style={{ objectFit: fit, objectPosition: position }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center bg-[var(--phone-screen)] p-[var(--phone-fallback-padding)] text-[var(--neutral-10)] text-[length:var(--phone-fallback-size)]"
              style={{ fontWeight: "var(--phone-fallback-weight)" }}
            >
              {address ? (
                <span className="max-w-full truncate rounded-[var(--radius-full)] border border-border bg-background/80 px-3 py-1">
                  {address}
                </span>
              ) : null}
            </div>
          ))}
      </div>

      <svg
        aria-hidden="true"
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 size-full"
        style={{ transform: "translateZ(0)" }}
      >
        <g mask={hasCapturedMedia ? `url(#${screenPunchId})` : undefined}>
          <path
            d="M2 73C2 32.68 34.68 0 75 0H357C397.32 0 430 32.68 430 73V809C430 849.32 397.32 882 357 882H75C34.68 882 2 849.32 2 809V73Z"
            className="fill-[var(--phone-frame)]"
          />
          <path
            d="M0 171C0 170.45 0.45 170 1 170H3V204H1C0.45 204 0 203.55 0 203V171Z"
            className="fill-[var(--phone-frame)]"
          />
          <path
            d="M1 234C1 233.45 1.45 233 2 233H3.5V300H2C1.45 300 1 299.55 1 299V234Z"
            className="fill-[var(--phone-frame)]"
          />
          <path
            d="M1 319C1 318.45 1.45 318 2 318H3.5V385H2C1.45 385 1 384.55 1 384V319Z"
            className="fill-[var(--phone-frame)]"
          />
          <path
            d="M430 279H432C432.55 279 433 279.45 433 280V384C433 384.55 432.55 385 432 385H430V279Z"
            className="fill-[var(--phone-frame)]"
          />
          <path
            d="M6 74C6 35.34 37.34 4 76 4H356C394.66 4 426 35.34 426 74V808C426 846.66 394.66 878 356 878H76C37.34 878 6 846.66 6 808V74Z"
            className="fill-[var(--phone-glass)]"
          />
        </g>

        <path
          opacity="0.5"
          d="M174 5H258V5.5C258 6.6 257.1 7.5 256 7.5H176C174.9 7.5 174 6.6 174 5.5V5Z"
          className="fill-[var(--phone-frame-muted)]"
        />
        <path
          d={screenPath}
          className="fill-[var(--phone-frame)] stroke-[0.5] stroke-[var(--phone-frame)]"
          mask={hasCapturedMedia ? `url(#${screenPunchId})` : undefined}
        />
        <path
          d="M154 48.5C154 38.28 162.28 30 172.5 30H259.5C269.72 30 278 38.28 278 48.5C278 58.72 269.72 67 259.5 67H172.5C162.28 67 154 58.72 154 48.5Z"
          className="fill-[var(--phone-cutout)]"
        />
        <path
          d="M249 48.5C249 42.7 253.7 38 259.5 38C265.3 38 270 42.7 270 48.5C270 54.3 265.3 59 259.5 59C253.7 59 249 54.3 249 48.5Z"
          className="fill-[var(--phone-cutout)]"
        />
        <path
          d="M254 48.5C254 45.46 256.46 43 259.5 43C262.54 43 265 45.46 265 48.5C265 51.54 262.54 54 259.5 54C256.46 54 254 51.54 254 48.5Z"
          className="fill-[var(--phone-frame-muted)]"
        />

        <defs>
          <mask id={screenPunchId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
            <rect
              x={screen.x}
              y={screen.y}
              width={screen.width}
              height={screen.height}
              rx={screen.radius}
              ry={screen.radius}
              fill="black"
            />
          </mask>
        </defs>
      </svg>
    </div>
  );
}

Phone.displayName = "Phone";

/** @deprecated Use `Phone` instead. */
export const IphoneMockup = Phone;
