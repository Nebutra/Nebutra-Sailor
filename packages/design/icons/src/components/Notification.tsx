import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Notification = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m-1 2.959A3 3 0 0 1 10.041 2.5H4.75A2.25 2.25 0 0 0 2.5 4.75v6.5a2.25 2.25 0 0 0 2.25 2.25h6.5a2.25 2.25 0 0 0 2.25-2.25zm1.5-.723v6.014A3.75 3.75 0 0 1 11.25 15h-6.5A3.75 3.75 0 0 1 1 11.25v-6.5A3.75 3.75 0 0 1 4.75 1h6.014A3 3 0 1 1 15 5.236"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Notification.displayName = "Notification";

export { Notification };
export default Notification;
