"use client";

import { motion } from "framer-motion";
import { Folder, HeartHandshake, type LucideIcon, Sparkles } from "lucide-react";
import { cn } from "../utils/cn";

// Inline CSS for offset-path animations (avoids external CSS dependency)
const ANIMATION_STYLES = `
.db-rest-api-light {
  offset-anchor: 10px 0px;
  animation: db-rest-api-path;
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  animation-duration: 4s;
  animation-delay: 1s;
}
.db-rest-api-light-1 { offset-path: path("M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 25"); }
.db-rest-api-light-2 { offset-path: path("M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 25"); }
.db-rest-api-light-3 { offset-path: path("M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 25"); }
.db-rest-api-light-4 { offset-path: path("M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 25"); }
@keyframes db-rest-api-path {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}
`;

export interface DatabaseRestApiBadge {
  /** Badge label */
  label: string;
}

export interface DatabaseRestApiProps {
  /** Additional className */
  className?: string;
  /** Text in the bottom circle */
  circleText?: string;
  /** Badge texts for API methods */
  badges?: {
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
  };
  /** Floating button labels */
  buttons?: {
    first?: string;
    second?: string;
  };
  /** Title text above the box */
  title?: string;
  /** Light animation color */
  lightColor?: string;
  /** First button icon */
  firstButtonIcon?: LucideIcon;
  /** Second button icon */
  secondButtonIcon?: LucideIcon;
}

/**
 * DatabaseRestApi - Animated REST API data flow visualization
 *
 * Shows animated paths from API method badges flowing into a central database.
 * Ideal for landing pages and documentation showcasing API concepts.
 */
export function DatabaseRestApi({
  className,
  circleText = "DB",
  badges = {},
  buttons = {},
  title = "Data exchange using a customized REST API",
  lightColor = "#00A6F5",
  firstButtonIcon: FirstIcon = HeartHandshake,
  secondButtonIcon: SecondIcon = Folder,
}: DatabaseRestApiProps) {
  const {
    first: badge1 = "GET",
    second: badge2 = "POST",
    third: badge3 = "PUT",
    fourth: badge4 = "DELETE",
  } = badges;

  const { first: btn1 = "API Client", second: btn2 = "v2_updates" } = buttons;

  return (
    <div
      className={cn(
        "relative flex h-[350px] w-full max-w-[500px] flex-col items-center",
        className,
      )}
    >
      <style>{ANIMATION_STYLES}</style>

      {/* SVG Paths */}
      <svg
        aria-hidden="true"
        className="h-full sm:w-full text-muted"
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
      >
        <g
          stroke="currentColor"
          fill="none"
          strokeWidth="0.4"
          strokeDasharray="100 100"
          pathLength="100"
        >
          <path d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10" />
          <path d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10" />
          <path d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10" />
          <path d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10" />
          <animate
            attributeName="stroke-dashoffset"
            from="100"
            to="0"
            dur="1s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.25,0.1,0.5,1"
            keyTimes="0; 1"
          />
        </g>

        {/* Animated lights */}
        <g mask="url(#db-mask-1)">
          <circle
            className="db-rest-api-light db-rest-api-light-1"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-2)">
          <circle
            className="db-rest-api-light db-rest-api-light-2"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-3)">
          <circle
            className="db-rest-api-light db-rest-api-light-3"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-4)">
          <circle
            className="db-rest-api-light db-rest-api-light-4"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>

        {/* Method badges */}
        <g stroke="currentColor" fill="none" strokeWidth="0.4">
          <g>
            <rect fill="#18181B" x="14" y="5" width="34" height="10" rx="5" />
            <DatabaseIcon x="18" y="7.5" />
            <text x="28" y="12" fill="white" stroke="none" fontSize="5" fontWeight="500">
              {badge1}
            </text>
          </g>
          <g>
            <rect fill="#18181B" x="60" y="5" width="34" height="10" rx="5" />
            <DatabaseIcon x="64" y="7.5" />
            <text x="74" y="12" fill="white" stroke="none" fontSize="5" fontWeight="500">
              {badge2}
            </text>
          </g>
          <g>
            <rect fill="#18181B" x="108" y="5" width="34" height="10" rx="5" />
            <DatabaseIcon x="112" y="7.5" />
            <text x="122" y="12" fill="white" stroke="none" fontSize="5" fontWeight="500">
              {badge3}
            </text>
          </g>
          <g>
            <rect fill="#18181B" x="150" y="5" width="40" height="10" rx="5" />
            <DatabaseIcon x="154" y="7.5" />
            <text x="165" y="12" fill="white" stroke="none" fontSize="5" fontWeight="500">
              {badge4}
            </text>
          </g>
        </g>

        <defs>
          <mask id="db-mask-1">
            <path d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10" strokeWidth="0.5" stroke="white" />
          </mask>
          <mask id="db-mask-2">
            <path d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10" strokeWidth="0.5" stroke="white" />
          </mask>
          <mask id="db-mask-3">
            <path
              d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-4">
            <path
              d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <radialGradient id="db-blue-grad" fx="1">
            <stop offset="0%" stopColor={lightColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>

      {/* Main Box */}
      <div className="absolute bottom-10 flex w-full flex-col items-center">
        <div className="absolute -bottom-4 h-[100px] w-[62%] rounded-[var(--radius-lg)] bg-accent/30" />

        <div className="absolute -top-3 z-20 flex items-center justify-center rounded-[var(--radius-lg)] border bg-card px-2 py-1 sm:-top-4 sm:py-1.5">
          <Sparkles className="size-3" />
          <span className="ml-2 text-[10px]">{title}</span>
        </div>

        <div className="absolute -bottom-8 z-30 grid h-[60px] w-[60px] place-items-center rounded-full border-t bg-card font-semibold text-xs">
          {circleText}
        </div>

        <div className="relative z-10 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border bg-background shadow-md">
          <div className="absolute bottom-8 left-12 z-10 flex h-7 items-center gap-2 rounded-full border bg-card px-3 text-xs">
            <FirstIcon className="size-4" />
            <span>{btn1}</span>
          </div>
          <div className="absolute right-16 z-10 hidden h-7 items-center gap-2 rounded-full border bg-card px-3 text-xs sm:flex">
            <SecondIcon className="size-4" />
            <span>{btn2}</span>
          </div>

          {/* Animated circles */}
          <motion.div
            className="absolute -bottom-14 h-[100px] w-[100px] rounded-full border-t bg-accent/5"
            animate={{ scale: [0.98, 1.02, 0.98, 1, 1, 1, 1, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 h-[145px] w-[145px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 0.98, 1.02, 0.98, 1, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[100px] h-[190px] w-[190px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[120px] h-[235px] w-[235px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}

DatabaseRestApi.displayName = "DatabaseRestApi";

/** Internal database icon for SVG context */
function DatabaseIcon({ x = "0", y = "0" }: { x: string; y: string }) {
  return (
    <svg
      aria-hidden="true"
      x={x}
      y={y}
      xmlns="http://www.w3.org/2000/svg"
      width="5"
      height="5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
