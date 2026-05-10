import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Eye = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M4.022 4.77a5.25 5.25 0 0 1 7.956 0L14.76 8l-2.782 3.23a5.25 5.25 0 0 1-7.956 0L1.24 8zm9.093-.98C10.422.664 5.578.664 2.885 3.79L-.318 7.51v.98l3.203 3.72c2.693 3.127 7.537 3.127 10.23 0l3.203-3.72v-.98zM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
      clipRule="evenodd"
    />
  </svg>
));
Eye.displayName = "Eye";

export { Eye };
export default Eye;
