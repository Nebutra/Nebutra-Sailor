import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Repositories = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.25 0A2.25 2.25 0 0 0 2 2.25v9.25a2.5 2.5 0 0 0 1.5 2.292V11a1 1 0 0 1 1-1h8v2.5h-2V14H14V0H4.25m8.25 8.5v-7H4.25a.75.75 0 0 0-.75.75v6.458a2.5 2.5 0 0 1 1-.208zm-7 3a.5.5 0 0 0-.5.5v4l2-1.25L9 16v-4a.5.5 0 0 0-.5-.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Repositories.displayName = "Repositories";

export { Repositories };
export default Repositories;
