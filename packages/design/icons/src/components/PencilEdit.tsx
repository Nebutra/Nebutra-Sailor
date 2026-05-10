import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PencilEdit = forwardRef<SVGSVGElement, IconProps>(
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
        d="m11.75.19.53.53 3 3 .53.53-.53.53L5.16 14.902A3.75 3.75 0 0 1 2.507 16H0v-2.507a3.75 3.75 0 0 1 1.098-2.652L11.22.72zm0 2.12L9.81 4.25l1.94 1.94 1.94-1.94zm-9.591 9.592L8.75 5.31l1.94 1.939-6.592 6.591a2.25 2.25 0 0 1-1.59.659H1.5v-1.007c0-.597.237-1.17.659-1.591M9 16h7v-1.5H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PencilEdit.displayName = "PencilEdit";

export { PencilEdit };
export default PencilEdit;
