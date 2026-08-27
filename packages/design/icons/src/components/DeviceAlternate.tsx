import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const DeviceAlternate = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1 3.25A3.25 3.25 0 0 1 4.25 0h7.5A3.25 3.25 0 0 1 15 3.25V16H1V3.25M4.25 1.5A1.75 1.75 0 0 0 2.5 3.25V14.5h11V3.25a1.75 1.75 0 0 0-1.75-1.75zM4 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6H4zm5 9h3v-1.5H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
DeviceAlternate.displayName = "DeviceAlternate";

export { DeviceAlternate };
export default DeviceAlternate;
