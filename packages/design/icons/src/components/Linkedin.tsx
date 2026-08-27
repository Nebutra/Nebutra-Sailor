import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Linkedin = forwardRef<SVGSVGElement, IconProps>(
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
        id="Subtract"
        fill="currentColor"
        fillRule="evenodd"
        d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm3 6.75V13H3V6.75zM5 4.5c0 .556-.386 1-1.006 1h-.012C3.386 5.5 3 5.056 3 4.5c0-.568.398-1 1.006-1s.982.432.994 1M8.5 13h-2s.032-5.568 0-6.25h2v1.034s.5-1.034 2-1.034 2.5.848 2.5 3.081V13h-2v-2.89s0-1.644-1.264-1.644S8.5 9.94 8.5 9.94z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Linkedin.displayName = "Linkedin";

export { Linkedin };
export default Linkedin;
