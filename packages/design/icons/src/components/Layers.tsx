import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Layers = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 5.251V4.25l.463-.192 7.25-3L8 .938l.287.119 7.25 3 .463.192V5.25l-.463.192-7.25 3L8 8.562l-.287-.119-7.25-3zm0 3.207V6.835l.537.222L8 10.145l7.463-3.088.537-.222v1.623L8.287 11.65 8 11.769l-.287-.12zm0 3.25v-1.623l.537.222L8 13.395l7.463-3.088.537-.222v1.623L8.287 14.9 8 15.019l-.287-.12zm8-4.77L2.712 4.75 8 2.562l5.289 2.188z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Layers.displayName = "Layers";

export { Layers };
export default Layers;
