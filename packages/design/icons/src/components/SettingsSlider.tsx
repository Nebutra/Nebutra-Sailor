import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SettingsSlider = forwardRef<SVGSVGElement, IconProps>(
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
        d="M5.773 6.398 4.75 7.5 3.727 6.398l-1.96-2.11a1 1 0 0 1-.267-.68V1a1 1 0 0 1 1-1H7a1 1 0 0 1 1 1v2.607a1 1 0 0 1-.267.68zM6.5 3.41 4.75 5.296 3 3.41V1.5h3.5zM5.5 9.5V12H16v1.5H5.5V16H4v-2.5H0V12h4V9.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SettingsSlider.displayName = "SettingsSlider";

export { SettingsSlider };
export default SettingsSlider;
