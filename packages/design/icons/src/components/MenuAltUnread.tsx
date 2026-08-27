import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MenuAltUnread = forwardRef<SVGSVGElement, IconProps>(
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
        d="M9.531 2H1v1.5h8.626A4 4 0 0 1 9.531 2M1.75 12H1v1.5h14V12H1.75M1 7h14v1.5H1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MenuAltUnread.displayName = "MenuAltUnread";

export { MenuAltUnread };
export default MenuAltUnread;
