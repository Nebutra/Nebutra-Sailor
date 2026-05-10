import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const StatusBordered = forwardRef<SVGSVGElement, IconProps>(
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
      <g fill="currentColor" clipPath="url(#clip0_6799_10812)">
        <path d="M8 5.031a2.969 2.969 0 1 1 0 5.938A2.969 2.969 0 0 1 8 5.03" />
        <path
          fillRule="evenodd"
          d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0m0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_6799_10812">
          <path fill="currentColor" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
StatusBordered.displayName = "StatusBordered";

export { StatusBordered };
export default StatusBordered;
