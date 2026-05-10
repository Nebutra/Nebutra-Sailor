import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const VerifiedCheckFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 0a1 1 0 0 1 .7.29l1.764 1.763h2.491a.993.993 0 0 1 .992.992v2.492L15.71 7.3a.99.99 0 0 1 0 1.4l-1.763 1.764v2.491a1 1 0 0 1-.612.917 1 1 0 0 1-.38.075h-2.491L8.7 15.71a.99.99 0 0 1-1.4 0l-1.764-1.763H3.045a.99.99 0 0 1-.992-.992v-2.491L.29 8.7a.99.99 0 0 1 0-1.4l1.763-1.764V3.045a.99.99 0 0 1 .992-.992h2.492L7.3.29A1 1 0 0 1 8 0M6.938 8.533 5.875 7.471l-1.06 1.06 1.592 1.593a.75.75 0 0 0 1.06 0l3.718-3.718-1.06-1.06z"
      />
    </svg>
  ),
);
VerifiedCheckFill.displayName = "VerifiedCheckFill";

export { VerifiedCheckFill };
export default VerifiedCheckFill;
