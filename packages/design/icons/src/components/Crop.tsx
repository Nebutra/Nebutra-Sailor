import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Crop = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M5 .75V0H3.5v3.5H0V5h3.5v6.5a1 1 0 0 0 1 1H11V16h1.5v-3.5H16V11h-3.5V4.5a1 1 0 0 0-1-1H5zM5 5v6h6V5z"
      clipRule="evenodd"
    />
  </svg>
));
Crop.displayName = "Crop";

export { Crop };
export default Crop;
