import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Code = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="m4.22 12.53.53.53L5.81 12l-.53-.53L1.81 8l3.47-3.47.53-.53-1.06-1.06-.53.53L.396 7.293a1 1 0 0 0 0 1.414zm7.56 0-.53.53L10.19 12l.53-.53L14.19 8l-3.47-3.47-.53-.53 1.06-1.06.53.53 3.824 3.823a1 1 0 0 1 0 1.414z"
      clipRule="evenodd"
    />
  </svg>
));
Code.displayName = "Code";

export { Code };
export default Code;
