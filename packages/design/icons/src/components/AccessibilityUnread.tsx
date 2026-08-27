import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AccessibilityUnread = forwardRef<SVGSVGElement, IconProps>(
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
      <circle cx={13.5} cy={2.5} r={2.5} fill="var(--ds-blue-900)" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.035 4.5H2V6h2.671A2 2 0 0 1 6.65 8.302L6.43 9.733c-.092.483-.24.954-.43 1.407L4.33 15.2l1.592.688 1.672-3.972c.133-.315.68-.315.812 0l1.672 3.972 1.592-.688L10 11.14a7 7 0 0 1-.43-1.407L9.283 8.43A2 2 0 0 1 11.238 6h.325a4 4 0 0 1-1.527-1.5m-.535-3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
AccessibilityUnread.displayName = "AccessibilityUnread";

export { AccessibilityUnread };
export default AccessibilityUnread;
