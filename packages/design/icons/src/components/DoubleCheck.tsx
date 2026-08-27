import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const DoubleCheck = forwardRef<SVGSVGElement, IconProps>(
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
        d="m11.502 3.86-.456.596-3.34 4.368-.415-.415-.655-.655 3.218-4.21.456-.595zM4.109 11.59l.793.793a1.75 1.75 0 0 1-2.29-.161L.67 10.28l-.53-.53 1.06-1.06.53.53 1.944 1.942a.3.3 0 0 0 .04.033zm11.187-7.135.456-.596-1.192-.911-.456.596-5.806 7.592a.25.25 0 0 1-.375.025L5.98 9.22l-.53-.53-1.061 1.06.53.53 1.943 1.943a1.75 1.75 0 0 0 2.628-.175z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
DoubleCheck.displayName = "DoubleCheck";

export { DoubleCheck };
export default DoubleCheck;
