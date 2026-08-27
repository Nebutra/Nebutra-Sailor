import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionRectangleFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1 0h14v13.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 13.5zm8.75 4.5a1 1 0 0 0-1 1v1h1.75V8H8.75v2.5a2.5 2.5 0 0 1-2.5 2.5H5.5v-1.5h.75a1 1 0 0 0 1-1V8H5.5V6.5h1.75v-1A2.5 2.5 0 0 1 9.75 3h.75v1.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionRectangleFill.displayName = "FunctionRectangleFill";

export { FunctionRectangleFill };
export default FunctionRectangleFill;
