import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FilterSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="m12.872 5.486-.187.184-2.81 2.765v4.441H8.3l-.163-.116-1.75-1.251-.262-.188V8.435L3.312 5.67l-.187-.184V3.125h9.747zm-8.497-.525 2.813 2.767.187.183v2.767l1.25.893v-3.66l.187-.183 2.81-2.766v-.587H4.375z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FilterSmall.displayName = "FilterSmall";

export { FilterSmall };
export default FilterSmall;
