import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronDoubleRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.854 8.707a1 1 0 0 0 0-1.414L9.03 3.47l-.53-.53L7.44 4l.53.53L11.44 8l-3.47 3.47-.53.53 1.06 1.06.53-.53zm-5 0a1 1 0 0 0 0-1.414L4.03 3.47l-.53-.53L2.44 4l.53.53L6.44 8l-3.47 3.47-.53.53 1.06 1.06.53-.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronDoubleRight.displayName = "ChevronDoubleRight";

export { ChevronDoubleRight };
export default ChevronDoubleRight;
