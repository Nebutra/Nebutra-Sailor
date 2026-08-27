import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionRust = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.75 0A2.25 2.25 0 0 1 16 2.25V8h-1.5V2.25a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75H8V16H2.25A2.25 2.25 0 0 1 0 13.75V2.25A2.25 2.25 0 0 1 2.25 0zM9.997 5h-.75c-.826 0-1.496.67-1.496 1.496V7H9.5v1.5H7.751v1.005A2.996 2.996 0 0 1 4.755 12.5h-.75V11h.75c.825 0 1.496-.67 1.496-1.495V8.5H4.5V7h1.751v-.504A2.996 2.996 0 0 1 9.247 3.5h.75z"
      />
      <path
        fill="var(--ds-gray-1000)"
        d="M12.336 8.743a3.6 3.6 0 1 1-.002 7.202 3.6 3.6 0 0 1 .002-7.202m-.582 4.406h.62a.05.05 0 0 1 .05.05v.819a.05.05 0 0 1-.05.05h-2.24a2.792 2.792 0 0 0 4.404 0H13.49a.4.4 0 0 1-.233-.07.5.5 0 0 1-.142-.179c-.068-.14-.103-.324-.14-.498-.037-.178-.078-.346-.156-.47a.4.4 0 0 0-.143-.143.45.45 0 0 0-.228-.054h-.694zm-2.016-1.846a2.8 2.8 0 0 0-.082 1.846h.808v-1.834H9.77a.05.05 0 0 1-.032-.012m2.598-1.758c-.789 0-1.5.327-2.008.851h2.939c.468 0 .877.312 1.023.703a.84.84 0 0 1-.004.622c-.077.188-.23.364-.471.51l.02.015q.066.056.14.15c.097.126.195.3.234.496.031.156.19.256.348.248a.3.3 0 0 0 .204-.094c.054-.06.093-.154.093-.293v-.149a.05.05 0 0 1 .05-.05h.221q.009-.105.01-.21a2.8 2.8 0 0 0-2.8-2.8m-.582 2.265h.917c.284 0 .396-.139.396-.248s-.112-.247-.396-.247h-.917z"
      />
    </svg>
  ),
);
FunctionRust.displayName = "FunctionRust";

export { FunctionRust };
export default FunctionRust;
