import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SkipBack = forwardRef<SVGSVGElement, IconProps>(
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
        d="m5.147 7.111-.031.02-.583.371-.452.287a.25.25 0 0 0 0 .422l.452.287.583.371.031.02 8.103 5.157.08.05.704.449.332.21a.25.25 0 0 0 .384-.21V1.455a.25.25 0 0 0-.384-.21l-.332.21-.703.448-.081.052zm8.103-3.378L6.544 8l6.706 4.268zM.75 2v-.75h1.5v13.5H.75V2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SkipBack.displayName = "SkipBack";

export { SkipBack };
export default SkipBack;
