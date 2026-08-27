import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Lambda = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2.75 0H2v1.5h.75c.933 0 1.784.536 2.187 1.378l1.436 3.001-.054.119-4 8.688-.314.682 1.363.627.313-.681 3.534-7.676 3.502 7.319c.613 1.28 2.394 1.393 3.163.2l.407-.631-1.261-.813-.406.63a.315.315 0 0 1-.55-.034L6.29 2.23A3.92 3.92 0 0 0 2.75 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Lambda.displayName = "Lambda";

export { Lambda };
export default Lambda;
