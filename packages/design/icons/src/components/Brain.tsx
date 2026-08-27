import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Brain = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10 0c1.268 0 2.332.86 2.65 2.026a3 3 0 0 1 2.136 4.576A3.49 3.49 0 0 1 16 9.25c0 1.082-.491 2.05-1.263 2.691A3.75 3.75 0 0 1 8 14.5a3.75 3.75 0 0 1-6.738-2.559A3.5 3.5 0 0 1 0 9.25a3.49 3.49 0 0 1 1.213-2.648 3 3 0 0 1 2.136-4.575A2.75 2.75 0 0 1 6 0a2.74 2.74 0 0 1 2 .866A2.74 2.74 0 0 1 10 0m0 1.5c-.69 0-1.25.56-1.25 1.25V5A3.75 3.75 0 0 1 5 8.75v-1.5A2.25 2.25 0 0 0 7.25 5V2.75a1.25 1.25 0 1 0-2.333.624.75.75 0 0 1-1.299.752 2.7 2.7 0 0 1-.249-.576 1.5 1.5 0 0 0-.83 2.335q.16-.046.325-.077a.75.75 0 0 1 .272 1.474 2.002 2.002 0 0 0 .728 3.935.75.75 0 0 1 .272 1.474 3.5 3.5 0 0 1-1.344-.013 2.25 2.25 0 0 0 4.458-.428V12A3.75 3.75 0 0 1 11 8.25v1.5A2.25 2.25 0 0 0 8.75 12v.25a2.25 2.25 0 0 0 4.457.428 3.5 3.5 0 0 1-1.343.013.75.75 0 0 1 .272-1.474q.176.032.364.033a2 2 0 0 0 .364-3.968.75.75 0 0 1 .272-1.474q.165.03.325.077a1.5 1.5 0 0 0-.831-2.335 2.7 2.7 0 0 1-.248.576.75.75 0 0 1-1.299-.752A1.25 1.25 0 0 0 10 1.5"
      />
    </svg>
  ),
);
Brain.displayName = "Brain";

export { Brain };
export default Brain;
