import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Forward10Seconds = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 7.945a7 7 0 0 1 4.262-6.444H1v-1.5h4.925a1 1 0 0 1 1 1v4.925h-1.5V2.674A5.5 5.5 0 0 0 7 13.445h.75v1.5H7a7 7 0 0 1-7-7m14.37-2.317c-.896 0-1.622.726-1.622 1.622v2.13a1.622 1.622 0 1 0 3.245 0V7.25c0-.896-.727-1.622-1.623-1.622m-.377 1.622a.377.377 0 1 1 .755 0v2.13a.377.377 0 1 1-.755 0zm-2.75-.877a.622.622 0 0 0-.774-.604l-1 .25-.604.151.302 1.208.604-.151.226-.057v2.58h-1v1.245h3.246V9.75h-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Forward10Seconds.displayName = "Forward10Seconds";

export { Forward10Seconds };
export default Forward10Seconds;
