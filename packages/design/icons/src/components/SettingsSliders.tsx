import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SettingsSliders = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10.75 5.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5m0-4.75c1.398 0 2.573.956 2.906 2.25H16v1.5h-2.344a3.001 3.001 0 0 1-5.811 0H0V3h7.845A3 3 0 0 1 10.75.75M15.25 13H16v-1.5H8.155a3.001 3.001 0 0 0-5.81 0H0V13h2.345a3.001 3.001 0 0 0 5.81 0zM7 12.251zv-.001a1.75 1.75 0 1 0 0 .002"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SettingsSliders.displayName = "SettingsSliders";

export { SettingsSliders };
export default SettingsSliders;
