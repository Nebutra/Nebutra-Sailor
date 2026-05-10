import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const StopwatchUnread = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      ref={ref}
      {...props}
    >
      <g clipPath="url(#clip0_4759_1908)">
        <circle cx={13.5} cy={2.5} r={2.5} fill="var(--ds-blue-900)" />
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M10 .562V-.25H6v1.5h1.25v.79a6.97 6.97 0 0 0-3.641 1.508L3.03 2.97l-.53-.53L1.44 3.5l.53.53.578.579a7 7 0 1 0 11.943 1.767 4 4 0 0 1-1.616.075 5.5 5.5 0 1 1-3.17-2.682 4 4 0 0 1-.191-1.605 7 7 0 0 0-.764-.124v-.79h.95q.118-.36.3-.688M8.75 6v3.75h-1.5V6z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_4759_1908">
          <path
            fill="#fff"
            d="M0 0h16v16H0z"
            style={{
              fill: "#fff",
              fillOpacity: 1,
            }}
          />
        </clipPath>
      </defs>
    </svg>
  ),
);
StopwatchUnread.displayName = "StopwatchUnread";

export { StopwatchUnread };
export default StopwatchUnread;
