import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LambdaRectangleFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1 0h14v13.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 13.5zm3.857 3.452h.75c.927 0 1.771.532 2.171 1.367l2.867 5.991.218-.338 1.26.812-.405.63a1.306 1.306 0 0 1-2.276-.143l-1.508-3.15-1.65 3.47-.322.678-1.354-.644.322-.678 2.123-4.464.048-.103-.676-1.413a.91.91 0 0 0-.818-.515h-.75z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LambdaRectangleFill.displayName = "LambdaRectangleFill";

export { LambdaRectangleFill };
export default LambdaRectangleFill;
