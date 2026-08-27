import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const DeviceAlternateSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3 5.25A3.25 3.25 0 0 1 6.25 2h4.5A3.25 3.25 0 0 1 14 5.25V14H3V5.25M6.25 3.5A1.75 1.75 0 0 0 4.5 5.25v7.25h8V5.25a1.75 1.75 0 0 0-1.75-1.75zm-.75 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V9h-6zm3.5 6h2.5V10H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
DeviceAlternateSmall.displayName = "DeviceAlternateSmall";

export { DeviceAlternateSmall };
export default DeviceAlternateSmall;
