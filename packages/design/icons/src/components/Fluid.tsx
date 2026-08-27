import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Fluid = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7 2h2V0h1.5v2H13a1 1 0 0 1 1 1v2.5h2V7h-2v2h2v1.5h-2V13a1 1 0 0 1-1 1h-2.5v2H9v-2H7v2H5.5v-2H3a1 1 0 0 1-1-1v-2.5H0V9h2V7H0V5.5h2V3a1 1 0 0 1 1-1h2.5V0H7v2M3.5 8.982V3.5h9V9H10c-.439 0-.705-.148-.863-.314A1 1 0 0 1 8.875 8c0-.263.094-.51.262-.686C9.295 7.148 9.56 7 10 7V5.5c-1.172 0-2.088.243-2.84.63-.744.384-1.288.89-1.731 1.35-.137.141-.258.272-.371.393-.278.298-.5.537-.76.74-.25.197-.497.325-.798.37m0 1.509V12.5h9v-2H10c-.811 0-1.483-.29-1.95-.78a2.5 2.5 0 0 1-.662-1.977 6 6 0 0 0-.88.778q-.134.14-.28.297c-.305.328-.645.694-1.003.975-.465.365-1.018.644-1.725.698"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Fluid.displayName = "Fluid";

export { Fluid };
export default Fluid;
