import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Percentage = forwardRef<SVGSVGElement, IconProps>(
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
        d="m11.475 1.332-.279.697-5 12.5-.278.696-1.393-.557.279-.697 5-12.5.278-.696zM4 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M7 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0m6.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Percentage.displayName = "Percentage";

export { Percentage };
export default Percentage;
