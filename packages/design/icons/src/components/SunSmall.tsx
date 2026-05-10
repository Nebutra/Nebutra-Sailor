import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SunSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M9 2.25V1.5H7.5v1.75H9v-1m-.75 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 1.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.75 1.5V15H7.5v-1.75zm4.25-5.75H15V9h-1.75zm-11 0H1.5V9h1.75V7.5h-1m9.005-3.316.53-.53.177-.177.53-.53 1.061 1.06-.53.53-.177.177-.53.53zm-7.778 7.778-.53.53 1.06 1.061.53-.53.177-.177.53-.53-1.06-1.06-.53.53zm.707-6.717-.53-.53-.177-.177-.53-.53 1.06-1.061.53.53.177.177.53.53zm7.778 7.778.53.53 1.061-1.06-.53-.53-.177-.177-.53-.53-1.06 1.06.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SunSmall.displayName = "SunSmall";

export { SunSmall };
export default SunSmall;
