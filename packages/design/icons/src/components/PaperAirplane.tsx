import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PaperAirplane = forwardRef<SVGSVGElement, IconProps>(
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
        d="m14.748.294-14 5L.73 6.7l6.085 2.34a.25.25 0 0 1 .143.144L9.3 15.27l1.407-.017 5-14zM7.314 7.625 3.157 6.026l8.954-3.198zm1.06 1.06 1.6 4.158 3.198-8.954z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PaperAirplane.displayName = "PaperAirplane";

export { PaperAirplane };
export default PaperAirplane;
