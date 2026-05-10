import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SortAscending = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.53 1.22a.75.75 0 0 0-1.06 0L9.22 3.47 8.69 4l1.06 1.06.53-.53.97-.97V14h1.5V3.56l.97.97.53.53L15.31 4l-.53-.53zM1.75 4H1v1.5h5V4H1.75m0 4.25H1v1.5h4v-1.5H1.75m0 4.25H1V14h7v-1.5H1.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SortAscending.displayName = "SortAscending";

export { SortAscending };
export default SortAscending;
