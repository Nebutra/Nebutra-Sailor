import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FirewallFlame = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4629_1942)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M0 1.25C0 .56.56 0 1.25 0h13.5C15.44 0 16 .56 16 1.25V5.5H6v4H1.5V12h3v1.5H1.25C.56 13.5 0 12.94 0 12.25zM1.5 8h3V5.5h-3zm3-4h-3V1.5h3zM6 1.5V4h4V1.5zM14.5 4h-3V1.5h3zM9 10l.362.241c.628.42 1.478.25 1.897-.38.157-.235.241-.512.241-.796V7S15 9 15 12.41c0 1.44-.818 2.673-2 3.246V15.5a1.5 1.5 0 0 0-3 0v.156a3.59 3.59 0 0 1-2-3.246C8 11 9 10 9 10"
          clipRule="evenodd"
          mask="url(#path-1-inside-1_4629_1942)"
          style={{
            fillOpacity: 1,
          }}
        />
      </g>
      <defs>
        <clipPath id="clip0_4629_1942">
          <path
            fill="#fff"
            d="M0 0h16v16H0z"
            style={{
              fill: "#fff",
              fillOpacity: 1,
            }}
          />
        </clipPath>
        <mask id="path-1-inside-1_4629_1942" fill="#fff">
          <path
            fillRule="evenodd"
            d="M0 1.25C0 .56.56 0 1.25 0h13.5C15.44 0 16 .56 16 1.25V5.5H6v4H1.5V12h3v1.5H1.25C.56 13.5 0 12.94 0 12.25zM1.5 8h3V5.5h-3zm3-4h-3V1.5h3zM6 1.5V4h4V1.5zM14.5 4h-3V1.5h3zM9 10l.362.241c.628.42 1.478.25 1.897-.38.157-.235.241-.512.241-.796V7S15 9 15 12.41c0 1.44-.818 2.673-2 3.246V15.5a1.5 1.5 0 0 0-3 0v.156a3.59 3.59 0 0 1-2-3.246C8 11 9 10 9 10"
            clipRule="evenodd"
          />
        </mask>
      </defs>
    </svg>
  ),
);
FirewallFlame.displayName = "FirewallFlame";

export { FirewallFlame };
export default FirewallFlame;
