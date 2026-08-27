import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Lifebuoy = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 8c0 1.107-.277 2.15-.765 3.063l-2.39-1.366c.259-.51.405-1.086.405-1.697 0-.61-.146-1.187-.405-1.697l2.39-1.366c.488.913.765 1.956.765 3.063m-3.437-5.735A6.5 6.5 0 0 0 8 1.5c-1.107 0-2.15.277-3.063.765l1.366 2.39A3.7 3.7 0 0 1 8 4.25c.61 0 1.188.146 1.697.405zm-1.366 9.08 1.366 2.39A6.5 6.5 0 0 1 8 14.5a6.5 6.5 0 0 1-3.063-.765l1.366-2.39c.51.259 1.086.405 1.697.405.61 0 1.188-.146 1.697-.405M4.655 9.697A3.7 3.7 0 0 1 4.25 8c0-.61.146-1.188.405-1.697l-2.39-1.366A6.5 6.5 0 0 0 1.5 8c0 1.107.277 2.15.765 3.063zM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-5.5 0a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Lifebuoy.displayName = "Lifebuoy";

export { Lifebuoy };
export default Lifebuoy;
