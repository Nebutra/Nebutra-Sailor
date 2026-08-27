import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoAmex = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4898_1833)">
        <rect
          width={16}
          height={16}
          fill="#016FD0"
          rx={2}
          style={{
            fill: "color(display-p3 .0039 .4353 .8157)",
            fillOpacity: 1,
          }}
        />
        <path
          fill="#fff"
          d="M7.1 2.5H16v11H6.5v-5H4.4z"
          style={{
            fill: "#fff",
            fillOpacity: 1,
          }}
        />
        <path
          fill="#016FD0"
          fillRule="evenodd"
          d="M7.793 3.5 6 7.5h1.23l.338-.801h1.833l.339.801H11l-1.786-4zm.154 2.301.538-1.273.537 1.273zM7.5 8.5v4h4.875l1.124-1.28 1.135 1.28H16v-.056l-1.787-1.946L16 8.53V8.5h-1.352l-1.12 1.268L12.414 8.5H7.5m3.5 0 1.826 1.998L11 12.5v-.932H8.633v-.615h2.31v-.906h-2.31v-.626H11zm0-5v3.99h1.05V4.75l.996 2.74h.944l.976-2.731V7.5L16 7.49V3.5h-1.607l-.865 2.46-.859-2.454z"
          clipRule="evenodd"
          style={{
            fill: "color(display-p3 .0039 .4353 .8157)",
            fillOpacity: 1,
          }}
        />
      </g>
      <defs>
        <clipPath id="clip0_4898_1833">
          <rect
            width={16}
            height={16}
            fill="#fff"
            rx={2}
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
LogoAmex.displayName = "LogoAmex";

export { LogoAmex };
export default LogoAmex;
