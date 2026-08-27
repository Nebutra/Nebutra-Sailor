import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const StopwatchFast = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7-.25h4v1.5H9.75v.79a6.97 6.97 0 0 1 3.641 1.508l.579-.578.53-.53 1.06 1.06-.53.53-.578.579a7 7 0 0 1-9.715 9.944H2v-1.5h3a.75.75 0 0 1 .48.173 5.5 5.5 0 1 0-.782-7.654l-1.172-.936A7 7 0 0 1 8.25 2.04v-.79H7zm4.652 7.659-.53.53L9.53 9.53l-.53.53L7.94 9l.53-.53 1.59-1.591.531-.53zM2 7h3v1.5H2zM.75 10H0v1.5h5V10H.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
StopwatchFast.displayName = "StopwatchFast";

export { StopwatchFast };
export default StopwatchFast;
