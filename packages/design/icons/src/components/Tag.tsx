import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Tag = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M1.5 1.5h4.843a2.5 2.5 0 0 1 1.768.732L13.879 8 8 13.879 2.232 8.11A2.5 2.5 0 0 1 1.5 6.343zM16 8l-1.06-1.06-5.768-5.768A4 4 0 0 0 6.343 0H0v6.343a4 4 0 0 0 1.172 2.829l5.767 5.767L8 16l1.06-1.06 5.88-5.88zM4.5 5.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5"
      clipRule="evenodd"
    />
  </svg>
));
Tag.displayName = "Tag";

export { Tag };
export default Tag;
