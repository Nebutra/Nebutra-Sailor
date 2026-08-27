import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Share = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.293 1.396a1 1 0 0 1 1.414 0L11.78 4.47l.53.53-1.06 1.06-.53-.53-1.97-1.97V11h-1.5V3.56L5.28 5.53l-.53.53L3.69 5l.53-.53zM13.5 9.25v4.25h-11v-5H1V14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5h-1.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Share.displayName = "Share";

export { Share };
export default Share;
