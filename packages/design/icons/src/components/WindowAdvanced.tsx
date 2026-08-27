import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const WindowAdvanced = forwardRef<SVGSVGElement, IconProps>(
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
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M.75 1H0v10.5A2.5 2.5 0 0 0 2.5 14H6v-1.5H2.5a1 1 0 0 1-1-1v-9h13V7H16V1zm3 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5"
        clipRule="evenodd"
      />
      <g clipPath="url(#a)">
        <path fill="currentColor" stroke="currentColor" d="M9 12.5 12.5 7v3.5H15L11.5 16v-3.5z" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M7 7h9v9H7z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
WindowAdvanced.displayName = "WindowAdvanced";

export { WindowAdvanced };
export default WindowAdvanced;
