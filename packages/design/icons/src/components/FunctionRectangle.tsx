import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionRectangle = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 1.5h-11v12a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1zM2.5 0H1v13.5A2.5 2.5 0 0 0 3.5 16h9a2.5 2.5 0 0 0 2.5-2.5V0H2.5m7.25 4.5a1 1 0 0 0-1 1v1h1.75V8H8.75v2.5a2.5 2.5 0 0 1-2.5 2.5H5.5v-1.5h.75a1 1 0 0 0 1-1V8H5.5V6.5h1.75v-1A2.5 2.5 0 0 1 9.75 3h.75v1.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionRectangle.displayName = "FunctionRectangle";

export { FunctionRectangle };
export default FunctionRectangle;
