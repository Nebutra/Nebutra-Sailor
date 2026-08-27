import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const InboxUnread = forwardRef<SVGSVGElement, IconProps>(
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
        d="m15.29 6.078.604 1.21a1 1 0 0 1 .106.448V12a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12V7.736a1 1 0 0 1 .106-.447L3 1.5h6.626A4 4 0 0 0 9.531 3H3.927l-2.25 4.5H6.75v.75a1.25 1.25 0 1 0 2.5 0V7.5h5.073l-.506-1.012a4 4 0 0 0 1.472-.41M1.5 12V9h3.854a2.751 2.751 0 0 0 5.292 0H14.5v3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1"
        clipRule="evenodd"
      />
    </svg>
  ),
);
InboxUnread.displayName = "InboxUnread";

export { InboxUnread };
export default InboxUnread;
