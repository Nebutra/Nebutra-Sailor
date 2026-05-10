import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const EdgeCache = forwardRef<SVGSVGElement, IconProps>(
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
        d="M.5 3.25A2.5 2.5 0 0 1 3 .75h10a2.5 2.5 0 0 1 2.5 2.5v1.5c0 .494-.143.955-.391 1.343a6.5 6.5 0 0 0-1.351-.69A1 1 0 0 0 14 4.75v-1.5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1.5a1 1 0 0 0 1 1h5.466c-.718.38-1.357.89-1.884 1.5H3a2.5 2.5 0 0 1-2.5-2.5zm5.37 5H3a2.5 2.5 0 0 0-2.5 2.5v1.5a2.5 2.5 0 0 0 2.5 2.5h2.87a6.5 6.5 0 0 1-.632-1.5H3a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1h2.238c.148-.53.362-1.034.632-1.5m-1.62-3.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7.5 4A.75.75 0 1 1 6 4a.75.75 0 0 1 1.5 0m5.73 8c-.03.815-.136 1.628-.318 2.428a3.25 3.25 0 0 0 1.8-2.428zm-1.425 2.736a3.3 3.3 0 0 1-.61 0A12.2 12.2 0 0 1 10.77 12h1.46a12.2 12.2 0 0 1-.425 2.736M13.23 11a13.2 13.2 0 0 0-.319-2.428 3.25 3.25 0 0 1 1.8 2.428zm-1.001 0a12.2 12.2 0 0 0-.425-2.736 3.3 3.3 0 0 0-.61 0A12.2 12.2 0 0 0 10.77 11zm-2.46 0c.03-.815.136-1.628.318-2.428A3.25 3.25 0 0 0 8.288 11zm.318 3.428c-.182-.8-.288-1.613-.319-2.428H8.29a3.25 3.25 0 0 0 1.799 2.428M11.5 16a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9"
        clipRule="evenodd"
      />
    </svg>
  ),
);
EdgeCache.displayName = "EdgeCache";

export { EdgeCache };
export default EdgeCache;
