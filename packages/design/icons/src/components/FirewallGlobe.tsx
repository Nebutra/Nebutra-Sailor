import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FirewallGlobe = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4628_1900)">
        <path
          fill="#666"
          fillRule="evenodd"
          d="M1.25 0C.56 0 0 .56 0 1.25v11c0 .69.56 1.25 1.25 1.25H4.5V12h-3V9.5H6v-4h10V1.25C16 .56 15.44 0 14.75 0zM4.5 8h-3V5.5h3zm-3-4h3V1.5h-3zM6 4V1.5h4V4zm5.5 0h3V1.5h-3zm1.73 8c-.03.815-.136 1.628-.318 2.428a3.25 3.25 0 0 0 1.8-2.428zm-1.425 2.736a3.3 3.3 0 0 1-.61 0A12.2 12.2 0 0 1 10.77 12h1.46a12.2 12.2 0 0 1-.425 2.736M13.23 11a13.2 13.2 0 0 0-.319-2.428 3.25 3.25 0 0 1 1.8 2.428zm-1.001 0a12.2 12.2 0 0 0-.425-2.736 3.3 3.3 0 0 0-.61 0A12.2 12.2 0 0 0 10.77 11zm-2.46 0c.03-.815.136-1.628.318-2.428A3.25 3.25 0 0 0 8.288 11zm.318 3.428c-.182-.8-.288-1.613-.319-2.428H8.29a3.25 3.25 0 0 0 1.799 2.428M11.5 16a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9"
          clipRule="evenodd"
          mask="url(#path-1-inside-1_4628_1900)"
          style={{
            fill: "color(display-p3 .4 .4 .4)",
            fillOpacity: 1,
          }}
        />
      </g>
      <defs>
        <clipPath id="clip0_4628_1900">
          <path
            fill="#fff"
            d="M0 0h16v16H0z"
            style={{
              fill: "#fff",
              fillOpacity: 1,
            }}
          />
        </clipPath>
        <mask id="path-1-inside-1_4628_1900" fill="#fff">
          <path
            fillRule="evenodd"
            d="M1.25 0C.56 0 0 .56 0 1.25v11c0 .69.56 1.25 1.25 1.25H4.5V12h-3V9.5H6v-4h10V1.25C16 .56 15.44 0 14.75 0zM4.5 8h-3V5.5h3zm-3-4h3V1.5h-3zM6 4V1.5h4V4zm5.5 0h3V1.5h-3zm1.73 8c-.03.815-.136 1.628-.318 2.428a3.25 3.25 0 0 0 1.8-2.428zm-1.425 2.736a3.3 3.3 0 0 1-.61 0A12.2 12.2 0 0 1 10.77 12h1.46a12.2 12.2 0 0 1-.425 2.736M13.23 11a13.2 13.2 0 0 0-.319-2.428 3.25 3.25 0 0 1 1.8 2.428zm-1.001 0a12.2 12.2 0 0 0-.425-2.736 3.3 3.3 0 0 0-.61 0A12.2 12.2 0 0 0 10.77 11zm-2.46 0c.03-.815.136-1.628.318-2.428A3.25 3.25 0 0 0 8.288 11zm.318 3.428c-.182-.8-.288-1.613-.319-2.428H8.29a3.25 3.25 0 0 0 1.799 2.428M11.5 16a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9"
            clipRule="evenodd"
          />
        </mask>
      </defs>
    </svg>
  ),
);
FirewallGlobe.displayName = "FirewallGlobe";

export { FirewallGlobe };
export default FirewallGlobe;
