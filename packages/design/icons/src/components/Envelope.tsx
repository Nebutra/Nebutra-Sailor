import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Envelope = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.264 3.5H2.736L8 8.012zM1.5 4.416V11.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V4.416L8.488 9.57 8 9.988l-.488-.419zM0 2h16v9.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 11.5V2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Envelope.displayName = "Envelope";

export { Envelope };
export default Envelope;
