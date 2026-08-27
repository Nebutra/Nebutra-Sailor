import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Pencil = forwardRef<SVGSVGElement, IconProps>(
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
        d="m12.28.72-.53-.53-.53.53L1.098 10.84A3.75 3.75 0 0 0 0 13.493V16h2.507a3.75 3.75 0 0 0 2.652-1.098L15.28 4.78l.53-.53-.53-.53zM9.81 4.25l1.94-1.94 1.94 1.94-1.94 1.94zM8.75 5.31l-6.591 6.592a2.25 2.25 0 0 0-.659 1.59V14.5h1.007a2.25 2.25 0 0 0 1.591-.659L10.69 7.25z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Pencil.displayName = "Pencil";

export { Pencil };
export default Pencil;
