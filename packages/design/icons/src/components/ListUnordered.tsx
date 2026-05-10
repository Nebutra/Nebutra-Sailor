import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ListUnordered = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2.5 4a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5m0 5.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5m1.25 4a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0M6.75 2H6v1.5h9V2H6.75m0 5.25H6v1.5h9v-1.5H6.75m0 5.25H6V14h9v-1.5H6.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ListUnordered.displayName = "ListUnordered";

export { ListUnordered };
export default ListUnordered;
