import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionPython = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_351_605)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M0 2.25A2.25 2.25 0 0 1 2.25 0h11.5A2.25 2.25 0 0 1 16 2.25V8h-1.5V2.25a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75H8V16H2.25A2.25 2.25 0 0 1 0 13.75zm6.25 4.246A2.996 2.996 0 0 1 9.246 3.5h.75V5h-.75C8.42 5 7.75 5.67 7.75 6.496V7H9.5v1.5H7.75v1.004A2.996 2.996 0 0 1 4.754 12.5h-.75V11h.75c.826 0 1.496-.67 1.496-1.496V8.5H4.5V7h1.75z"
          clipRule="evenodd"
        />
        <path
          fill="#FFC700"
          d="M14 15a1 1 0 0 1-1 1h-.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1 1 1 0 0 0 1-1V11h.75a1.75 1.75 0 1 1 0 3.5H14z"
        />
        <path
          fill="#338ED8"
          d="M11 10a1 1 0 0 1 1-1h.5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1 1 1 0 0 0-1 1v.5h-.75a1.75 1.75 0 1 1 0-3.5H11z"
        />
      </g>
      <defs>
        <clipPath id="clip0_351_605">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
FunctionPython.displayName = "FunctionPython";

export { FunctionPython };
export default FunctionPython;
