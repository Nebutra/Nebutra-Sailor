import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Check = forwardRef<SVGSVGElement, IconProps>(
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
        d="m15.56 4-.53.53-8.793 8.793a1.75 1.75 0 0 1-2.474 0l.53-.53-.53.53L.97 10.53.44 10 1.5 8.94l.53.53 2.793 2.793a.25.25 0 0 0 .354 0L13.97 3.47l.53-.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Check.displayName = "Check";

export { Check };
export default Check;
