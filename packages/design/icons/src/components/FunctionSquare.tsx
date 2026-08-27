import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionSquare = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 2.25A2.25 2.25 0 0 1 2.25 0h11.5A2.25 2.25 0 0 1 16 2.25v11.5A2.25 2.25 0 0 1 13.75 16H2.25A2.25 2.25 0 0 1 0 13.75zm2.25-.75a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75V2.25a.75.75 0 0 0-.75-.75zM10.246 5C9.42 5 8.75 5.67 8.75 6.496V7h1.75v1.5H8.75v1.004A2.996 2.996 0 0 1 5.754 12.5h-.75V11h.75c.826 0 1.496-.67 1.496-1.496V8.5H5.5V7h1.75v-.504A2.996 2.996 0 0 1 10.246 3.5h.75V5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionSquare.displayName = "FunctionSquare";

export { FunctionSquare };
export default FunctionSquare;
