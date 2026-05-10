import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Lens = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M9.753 14.26a6.5 6.5 0 0 1-7.517-3.254h7.517zm1.254-.496a6.5 6.5 0 0 0 3.254-7.517h-3.254zm2.757-8.771H6.247V1.739a6.5 6.5 0 0 1 7.517 3.254M4.993 2.236a6.5 6.5 0 0 0-3.254 7.517h3.254V2.236M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.247 6.247h3.506v3.506H6.247z"
      clipRule="evenodd"
    />
  </svg>
));
Lens.displayName = "Lens";

export { Lens };
export default Lens;
