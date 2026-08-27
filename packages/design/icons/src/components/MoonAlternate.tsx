import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MoonAlternate = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_174_19363)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M14.5 8A6.5 6.5 0 0 1 1.645 9.372c.167.404.407.772.723 1.088 1.678 1.678 4.851 1.226 7.088-1.01 2.236-2.237 2.688-5.41 1.01-7.089a3.3 3.3 0 0 0-1.051-.707A6.5 6.5 0 0 1 14.5 8M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_174_19363">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
MoonAlternate.displayName = "MoonAlternate";

export { MoonAlternate };
export default MoonAlternate;
