import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowCircleFillDownRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0M4.818 5.629 8.311 9.12H5.482v1.5h4.64a.75.75 0 0 0 .746-.673l.003-.077V5.232H9.372v2.829L5.88 4.568z"
      />
    </svg>
  ),
);
ArrowCircleFillDownRight.displayName = "ArrowCircleFillDownRight";

export { ArrowCircleFillDownRight };
export default ArrowCircleFillDownRight;
