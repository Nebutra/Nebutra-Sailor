import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const QuestionFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-7 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7.096 5.822A1 1 0 1 1 8.143 7.24c-.44.063-.893.435-.893 1.01v1h1.5v-.615a2.5 2.5 0 1 0-3.009-3.457l-.322.678 1.355.643z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
QuestionFill.displayName = "QuestionFill";

export { QuestionFill };
export default QuestionFill;
