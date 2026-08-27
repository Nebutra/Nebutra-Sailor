import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Trash = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.75 2.75a1.25 1.25 0 1 1 2.5 0V3h-2.5zM5.25 3v-.25a2.75 2.75 0 0 1 5.5 0V3H15v1.5h-1.115l-.707 9.192A2.5 2.5 0 0 1 10.685 16h-5.37a2.5 2.5 0 0 1-2.493-2.308L2.115 4.5H1V3h4.25m-.932 10.577L3.62 4.5h8.76l-.698 9.077a1 1 0 0 1-.997.923h-5.37a1 1 0 0 1-.997-.923"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Trash.displayName = "Trash";

export { Trash };
export default Trash;
