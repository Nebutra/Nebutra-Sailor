import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Microfrontends = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 14 14"
      ref={ref}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.25 5c.347 0 .676-.079.97-.22L7 8.56l3.78-3.78a2.25 2.25 0 1 0-1.06-1.06L7 6.44 4.28 3.72A2.25 2.25 0 1 0 2.25 5M3 2.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m8.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M2.25 13.5A2.25 2.25 0 0 0 3 9.128V6.5H1.5v2.628a2.25 2.25 0 0 0 .75 4.372M3 11.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0M11.75 13.5a2.25 2.25 0 0 0 .75-4.372V6.5H11v2.628a2.25 2.25 0 0 0 .75 4.372m.75-2.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Microfrontends.displayName = "Microfrontends";

export { Microfrontends };
export default Microfrontends;
