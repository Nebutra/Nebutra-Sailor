import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Link = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M8.47 1.47a4.285 4.285 0 1 1 6.06 6.06l-2.5 2.5-1.06-1.06 2.5-2.5a2.786 2.786 0 0 0-3.94-3.94l-2.5 2.5-1.06-1.06zm3.06 4.06-6 6-1.06-1.06 6-6zm-10.06 9a4.285 4.285 0 0 0 6.06 0l2.5-2.5-1.06-1.06-2.5 2.5a2.786 2.786 0 0 1-3.94-3.94l2.5-2.5-1.06-1.06-2.5 2.5a4.285 4.285 0 0 0 0 6.06"
      clipRule="evenodd"
    />
  </svg>
));
Link.displayName = "Link";

export { Link };
export default Link;
