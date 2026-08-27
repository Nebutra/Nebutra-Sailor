import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const EyeOff = forwardRef<SVGSVGElement, IconProps>(
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
        d="m.191 2.062.56.499 13.5 12 .561.498.997-1.121-.56-.499-1.81-1.607 2.88-3.343v-.978l-3.204-3.72C10.645.92 6.365.685 3.594 3.08L1.748 1.44 1.188.94zM14.761 8l-2.442 2.835-1.65-1.465a3.001 3.001 0 0 0-4.342-3.86l-1.6-1.422a5.253 5.253 0 0 1 7.251.681zM7.526 6.576l1.942 1.727a1.499 1.499 0 0 0-1.942-1.727m-7.845.935 1.722-2 1.137.978L1.24 8l2.782 3.23A5.25 5.25 0 0 0 9.9 12.703l.54 1.399a6.75 6.75 0 0 1-7.555-1.892L-.318 8.49z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
EyeOff.displayName = "EyeOff";

export { EyeOff };
export default EyeOff;
