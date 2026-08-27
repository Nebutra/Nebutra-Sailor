import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Rss = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M1 2.5c6.904 0 12.5 5.596 12.5 12.5H15C15 7.268 8.732 1 1 1zM8 15a7 7 0 0 0-7-7V6.5A8.5 8.5 0 0 1 9.5 15zm-5.5 0A1.5 1.5 0 0 0 1 13.5V12a3 3 0 0 1 3 3z"
      clipRule="evenodd"
    />
  </svg>
));
Rss.displayName = "Rss";

export { Rss };
export default Rss;
