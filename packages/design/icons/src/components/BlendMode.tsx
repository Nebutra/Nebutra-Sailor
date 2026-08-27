import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const BlendMode = forwardRef<SVGSVGElement, IconProps>(
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
        d="M9.992 9.992Q9.872 10 9.75 10a3.75 3.75 0 0 1-3.742-3.992Q6.128 6 6.25 6a3.75 3.75 0 0 1 3.742 3.992m1.505-.423A5.25 5.25 0 0 0 6.43 4.503 3.75 3.75 0 0 1 13.5 6.25a3.75 3.75 0 0 1-2.003 3.32m-.222 1.706a5.25 5.25 0 1 0-6.55-6.55 5.25 5.25 0 1 0 6.55 6.55m-1.706.222A5.25 5.25 0 0 1 4.503 6.43 3.75 3.75 0 0 0 6.25 13.5a3.75 3.75 0 0 0 3.32-2.003"
        clipRule="evenodd"
      />
    </svg>
  ),
);
BlendMode.displayName = "BlendMode";

export { BlendMode };
export default BlendMode;
