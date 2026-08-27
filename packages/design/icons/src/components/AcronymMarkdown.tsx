import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AcronymMarkdown = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 22 16"
      ref={ref}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M19.5 2.25h-17c-.69 0-1.25.56-1.25 1.25v9c0 .69.56 1.25 1.25 1.25h17c.69 0 1.25-.56 1.25-1.25v-9c0-.69-.56-1.25-1.25-1.25M2.5 1A2.5 2.5 0 0 0 0 3.5v9A2.5 2.5 0 0 0 2.5 15h17a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 19.5 1zM3 4.5h1.69l.297.324L7 7.02l2.013-2.196.297-.324H11v7H9V7.798L7.737 9.176 7 9.98l-.737-.804L5 7.798V11.5H3v-7M15 8V4.5h2V8h2.5L17 10.5l-1 1-1-1L12.5 8z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
AcronymMarkdown.displayName = "AcronymMarkdown";

export { AcronymMarkdown };
export default AcronymMarkdown;
