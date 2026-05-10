import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoTurbopack = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3187)">
        <path
          fill="url(#paint0_linear_872_3187)"
          fillRule="evenodd"
          d="M0 2.993V13c0 .648.205 1.248.555 1.738l1.479-1.479A1 1 0 0 1 2 13V8H0zM8 2h5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8.5v2H13a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3H8zm-.5 14v-2H3q-.135 0-.259-.034l-1.48 1.48C1.753 15.794 2.353 16 3 16z"
          clipRule="evenodd"
        />
        <mask id="path-2-inside-1_872_3187" fill="#fff">
          <rect width={9} height={9} x={3.5} y={3.5} rx={0.5} />
        </mask>
        <rect
          width={9}
          height={9}
          x={3.5}
          y={3.5}
          fill="transparent"
          stroke="var(--ds-gray-1000)"
          strokeWidth={4}
          mask="url(#path-2-inside-1_872_3187)"
          rx={0.5}
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_872_3187"
          x1={8.688}
          x2={1.798}
          y1={1.984}
          y2={8.828}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0096FF" />
          <stop offset={1} stopColor="#FF1E56" />
        </linearGradient>
        <clipPath id="clip0_872_3187">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoTurbopack.displayName = "LogoTurbopack";

export { LogoTurbopack };
export default LogoTurbopack;
