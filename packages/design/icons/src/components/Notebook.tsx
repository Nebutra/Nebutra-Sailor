import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Notebook = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.285 1.5H13V12a1 1 0 0 1-1 1H6.285zm-1.25 0H3V12a1 1 0 0 0 1 1h1.035zm0 13H4A2.5 2.5 0 0 1 1.5 12V0h13v12a2.5 2.5 0 0 1-2.5 2.5H6.285v1.125h-1.25V14.5m3.47-11.125h2.25v1.25h-2.25zm.625 3h-.625v1.25h2.25v-1.25H9.13"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Notebook.displayName = "Notebook";

export { Notebook };
export default Notebook;
