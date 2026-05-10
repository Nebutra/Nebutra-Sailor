import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Alpha = forwardRef<SVGSVGElement, IconProps>(
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
      <circle
        cx={8}
        cy={8}
        r={7.25}
        fill="transparent"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.5}
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5 1h2v2H5zm0 4V3H3v2H1v2h2v2H1v2h2v2h2v2h2v-2h2v2h2v-2h2v-2h2V9h-2V7h2V5h-2V3h-2V1H9v2H7v2zm0 2H3V5h2zm2 0V5h2v2zm0 2V7H5v2H3v2h2v2h2v-2h2v2h2v-2h2V9h-2V7h2V5h-2V3H9v2h2v2H9v2zm2 0h2v2H9zM7 9v2H5V9z"
        clipRule="evenodd"
        opacity={0.33}
      />
    </svg>
  ),
);
Alpha.displayName = "Alpha";

export { Alpha };
export default Alpha;
