import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Music = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 1.5h-11v12a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1zM2.5 0H1v13.5A2.5 2.5 0 0 0 3.5 16h9a2.5 2.5 0 0 0 2.5-2.5V0H2.5m2.75 10.5a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0M6.5 13a2.5 2.5 0 1 1 1.245-4.668V3.5l1.123-.376.002.001.01.013.044.055q.06.075.175.207c.153.173.37.404.628.632.549.486 1.15.843 1.653.843h.625v1.25h-.625c-.943 0-1.803-.575-2.385-1.073v5.288q.005.08.005.16A2.5 2.5 0 0 1 6.5 13"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Music.displayName = "Music";

export { Music };
export default Music;
