"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export type AwardBadgeType =
  | "golden-kitty"
  | "product-of-the-day"
  | "product-of-the-month"
  | "product-of-the-week";

export interface AwardBadgeProps {
  /** Type of Product Hunt award */
  type: AwardBadgeType;
  /** Placement number (1st, 2nd, 3rd, etc.) */
  place?: number;
  /** Link to the award page */
  link?: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const IDENTITY_MATRIX = "1, 0, 0, 0, " + "0, 1, 0, 0, " + "0, 0, 1, 0, " + "0, 0, 0, 1";

const MAX_ROTATE = 0.25;
const MIN_ROTATE = -0.25;
const MAX_SCALE = 1;
const MIN_SCALE = 0.97;

/** Badge background colors by place: 1st (gold), 2nd (silver), 3rd (bronze) */
const BACKGROUND_COLORS = ["#f3e3ac", "#ddd", "#f1cfa6"];

/** Award type display titles */
const AWARD_TITLES: Record<AwardBadgeType, string> = {
  "golden-kitty": "Golden Kitty Awards",
  "product-of-the-day": "Product of the Day",
  "product-of-the-month": "Product of the Month",
  "product-of-the-week": "Product of the Week",
};

// =============================================================================
// Component
// =============================================================================

/**
 * AwardBadge - Product Hunt award badge with 3D hover effect
 *
 * @description
 * An interactive badge component that displays Product Hunt awards
 * with a holographic rainbow overlay effect on hover. Features smooth
 * 3D perspective transforms following mouse movement.
 *
 * @example Golden Kitty Award
 * ```tsx
 * <AwardBadge
 *   type="golden-kitty"
 *   link="https://producthunt.com/golden-kitty-awards"
 * />
 * ```
 *
 * @example Product of the Day with place
 * ```tsx
 * <AwardBadge
 *   type="product-of-the-day"
 *   place={1}
 *   link="https://producthunt.com/posts/your-product"
 * />
 * ```
 *
 * @example Multiple badges
 * ```tsx
 * <div className="flex gap-4">
 *   <AwardBadge type="product-of-the-day" place={1} />
 *   <AwardBadge type="product-of-the-week" place={2} />
 *   <AwardBadge type="golden-kitty" />
 * </div>
 * ```
 */
export function AwardBadge({ type, place, link, className }: AwardBadgeProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [firstOverlayPosition, setFirstOverlayPosition] = useState<number>(0);
  const [matrix, setMatrix] = useState<string>(IDENTITY_MATRIX);
  const [currentMatrix, setCurrentMatrix] = useState<string>(IDENTITY_MATRIX);
  const [disableInOutOverlayAnimation, setDisableInOutOverlayAnimation] = useState<boolean>(true);
  const [disableOverlayAnimation, setDisableOverlayAnimation] = useState<boolean>(false);
  const [isTimeoutFinished, setIsTimeoutFinished] = useState<boolean>(false);

  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout3 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDimensions = () => {
    const left = ref?.current?.getBoundingClientRect()?.left || 0;
    const right = ref?.current?.getBoundingClientRect()?.right || 0;
    const top = ref?.current?.getBoundingClientRect()?.top || 0;
    const bottom = ref?.current?.getBoundingClientRect()?.bottom || 0;

    return { left, right, top, bottom };
  };

  const getMatrix = (clientX: number, clientY: number) => {
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;

    const scale = [
      MAX_SCALE - ((MAX_SCALE - MIN_SCALE) * Math.abs(xCenter - clientX)) / (xCenter - left),
      MAX_SCALE - ((MAX_SCALE - MIN_SCALE) * Math.abs(yCenter - clientY)) / (yCenter - top),
      MAX_SCALE -
        ((MAX_SCALE - MIN_SCALE) * (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY))) /
          (xCenter - left + yCenter - top),
    ];

    const rotate = {
      x1: 0.25 * ((yCenter - clientY) / yCenter - (xCenter - clientX) / xCenter),
      x2: MAX_ROTATE - ((MAX_ROTATE - MIN_ROTATE) * Math.abs(right - clientX)) / (right - left),
      x3: 0,
      y0: 0,
      y2: MAX_ROTATE - ((MAX_ROTATE - MIN_ROTATE) * (top - clientY)) / (top - bottom),
      y3: 0,
      z0: -(MAX_ROTATE - ((MAX_ROTATE - MIN_ROTATE) * Math.abs(right - clientX)) / (right - left)),
      z1: 0.2 - ((0.2 + 0.6) * (top - clientY)) / (top - bottom),
      z3: 0,
    };

    return (
      `${scale[0]}, ${rotate.y0}, ${rotate.z0}, 0, ` +
      `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
      `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
      `${rotate.x3}, ${rotate.y3}, ${rotate.z3}, 1`
    );
  };

  const getOppositeMatrix = (_matrix: string, clientY: number, onMouseEnter?: boolean) => {
    const { top, bottom } = getDimensions();
    const oppositeY = bottom - clientY + top;
    const weakening = onMouseEnter ? 0.7 : 4;
    const multiplier = onMouseEnter ? -1 : 1;

    return _matrix
      .split(", ")
      .map((item, index) => {
        if (index === 2 || index === 4 || index === 8) {
          return (-parseFloat(item) * multiplier) / weakening;
        } else if (index === 0 || index === 5 || index === 10) {
          return "1";
        } else if (index === 6) {
          return (
            (multiplier *
              (MAX_ROTATE - ((MAX_ROTATE - MIN_ROTATE) * (top - oppositeY)) / (top - bottom))) /
            weakening
          );
        } else if (index === 9) {
          return (
            (MAX_ROTATE - ((MAX_ROTATE - MIN_ROTATE) * (top - oppositeY)) / (top - bottom)) /
            weakening
          );
        }
        return item;
      })
      .join(", ");
  };

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    if (leaveTimeout1.current) clearTimeout(leaveTimeout1.current);
    if (leaveTimeout2.current) clearTimeout(leaveTimeout2.current);
    if (leaveTimeout3.current) clearTimeout(leaveTimeout3.current);

    setDisableOverlayAnimation(true);

    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;

    setDisableInOutOverlayAnimation(false);
    enterTimeout.current = setTimeout(() => setDisableInOutOverlayAnimation(true), 350);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFirstOverlayPosition(
          (Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5,
        );
      });
    });

    const newMatrix = getMatrix(e.clientX, e.clientY);
    const oppositeMatrix = getOppositeMatrix(newMatrix, e.clientY, true);

    setMatrix(oppositeMatrix);
    setIsTimeoutFinished(false);
    setTimeout(() => setIsTimeoutFinished(true), 200);
  };

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;

    setTimeout(
      () =>
        setFirstOverlayPosition(
          (Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5,
        ),
      150,
    );

    if (isTimeoutFinished) {
      setCurrentMatrix(getMatrix(e.clientX, e.clientY));
    }
  };

  const handleMouseLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    const oppositeMatrix = getOppositeMatrix(matrix, e.clientY);

    if (enterTimeout.current) clearTimeout(enterTimeout.current);

    setCurrentMatrix(oppositeMatrix);
    setTimeout(() => setCurrentMatrix(IDENTITY_MATRIX), 200);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisableInOutOverlayAnimation(false);
        leaveTimeout1.current = setTimeout(
          () => setFirstOverlayPosition(-firstOverlayPosition / 4),
          150,
        );
        leaveTimeout2.current = setTimeout(() => setFirstOverlayPosition(0), 300);
        leaveTimeout3.current = setTimeout(() => {
          setDisableOverlayAnimation(false);
          setDisableInOutOverlayAnimation(true);
        }, 500);
      });
    });
  };

  useEffect(() => {
    if (isTimeoutFinished) {
      setMatrix(currentMatrix);
    }
  }, [currentMatrix, isTimeoutFinished]);

  // Generate keyframe animations for overlay layers
  const overlayAnimations = [...Array(10).keys()]
    .map(
      (e) => `
      @keyframes phAwardOverlay${e + 1} {
        0% { transform: rotate(${e * 10}deg); }
        50% { transform: rotate(${(e + 1) * 10}deg); }
        100% { transform: rotate(${e * 10}deg); }
      }
    `,
    )
    .join(" ");

  const backgroundColor = BACKGROUND_COLORS[(place || 2) - 1] || BACKGROUND_COLORS[1];
  const title = AWARD_TITLES[type];

  const overlayColors = [
    "hsl(358, 100%, 62%)",
    "hsl(30, 100%, 50%)",
    "hsl(60, 100%, 50%)",
    "hsl(96, 100%, 50%)",
    "hsl(233, 85%, 47%)",
    "hsl(271, 85%, 47%)",
    "hsl(300, 20%, 35%)",
    "transparent",
    "transparent",
    "white",
  ];

  return (
    <a
      ref={ref}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("block w-[180px] sm:w-[260px] h-auto cursor-pointer", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <style>{overlayAnimations}</style>
      <div
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          transformOrigin: "center center",
          transition: "transform 200ms ease-out",
        }}
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 260 54"
          className="w-[180px] sm:w-[260px] h-auto"
        >
          <defs>
            <filter id="phBadgeBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <mask id="phBadgeMask">
              <rect width="260" height="54" fill="white" rx="10" />
            </mask>
          </defs>

          {/* Background */}
          <rect width="260" height="54" rx="10" fill={backgroundColor} />
          <rect
            x="4"
            y="4"
            width="252"
            height="46"
            rx="8"
            fill="transparent"
            stroke="#bbb"
            strokeWidth="1"
          />

          {/* Text */}
          <text
            fontFamily="Helvetica-Bold, Helvetica, Arial, sans-serif"
            fontSize="9"
            fontWeight="bold"
            fill="#666"
            x="53"
            y="20"
          >
            PRODUCT HUNT
          </text>
          <text
            fontFamily="Helvetica-Bold, Helvetica, Arial, sans-serif"
            fontSize="16"
            fontWeight="bold"
            fill="#666"
            x="52"
            y="40"
          >
            {title}
            {place && ` #${place}`}
          </text>

          {/* Product Hunt Logo */}
          <g transform="translate(8, 9)">
            <path
              fill="#666"
              d="M14.963 9.075c.787-3-.188-5.887-.188-5.887S12.488 5.175 11.7 8.175c-.787 3 .188 5.887.188 5.887s2.25-1.987 3.075-4.987m-4.5 1.987c.787 3-.188 5.888-.188 5.888S7.988 14.962 7.2 11.962c-.787-3 .188-5.887.188-5.887s2.287 1.987 3.075 4.987m.862 10.388s-.6-2.962-2.775-5.175C6.337 14.1 3.375 13.5 3.375 13.5s.6 2.962 2.775 5.175c2.213 2.175 5.175 2.775 5.175 2.775m3.3 3.413s-1.988-2.288-4.988-3.075-5.887.187-5.887.187 1.987 2.287 4.988 3.075c3 .787 5.887-.188 5.887-.188Zm6.75 0s1.988-2.288 4.988-3.075c3-.826 5.887.187 5.887.187s-1.988 2.287-4.988 3.075c-3 .787-5.887-.188-5.887-.188ZM32.625 13.5s-2.963.6-5.175 2.775c-2.213 2.213-2.775 5.175-2.775 5.175s2.962-.6 5.175-2.775c2.175-2.213 2.775-5.175 2.775-5.175M28.65 6.075s.975 2.887.188 5.887c-.826 3-3.076 4.988-3.076 4.988s-.974-2.888-.187-5.888c.788-3 3.075-4.987 3.075-4.987m-4.5 7.987s.975-2.887.188-5.887c-.788-3-3.076-4.988-3.076-4.988s-.974 2.888-.187 5.888c.788 3 3.075 4.988 3.075 4.988ZM18 26.1c.975-.225 3.113-.6 5.325 0 3 .788 5.063 3.038 5.063 3.038s-2.888.975-5.888.187a13 13 0 0 1-1.425-.525c.563.788 1.125 1.425 2.288 1.913l-.863 2.062c-2.063-.862-2.925-2.137-3.675-3.262-.262-.375-.525-.713-.787-1.05-.26.293-.465.586-.686.903l-.102.147-.048.068c-.775 1.108-1.643 2.35-3.627 3.194l-.862-2.062c1.162-.488 1.725-1.125 2.287-1.913-.45.225-.938.375-1.425.525-3 .788-5.887-.187-5.887-.187s1.987-2.288 4.987-3.075c2.212-.563 4.35-.188 5.325.037"
            />
          </g>

          {/* Holographic overlay */}
          <g style={{ mixBlendMode: "overlay" }} mask="url(#phBadgeMask)">
            {overlayColors.map((color, i) => (
              <g
                key={i}
                style={{
                  transform: `rotate(${firstOverlayPosition + i * 10}deg)`,
                  transformOrigin: "center center",
                  transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
                  animation: disableOverlayAnimation
                    ? "none"
                    : `phAwardOverlay${i + 1} 5s infinite`,
                  willChange: "transform",
                }}
              >
                <polygon
                  points="0,0 260,54 260,0 0,54"
                  fill={color}
                  filter="url(#phBadgeBlur)"
                  opacity="0.5"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </a>
  );
}

export { AWARD_TITLES as AWARD_BADGE_TITLES };
