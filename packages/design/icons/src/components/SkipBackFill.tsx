import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SkipBackFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.081 8.21a.25.25 0 0 1 0-.42l10.285-6.545a.25.25 0 0 1 .384.21v13.09a.25.25 0 0 1-.384.21zM.75 2v-.75h1.5v13.5H.75V2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SkipBackFill.displayName = "SkipBackFill";

export { SkipBackFill };
export default SkipBackFill;
