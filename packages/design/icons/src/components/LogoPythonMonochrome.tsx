import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoPythonMonochrome = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.905 0c-.66.003-1.29.059-1.844.156-1.634.285-1.93.883-1.93 1.984v1.455h3.86v.485H2.682C1.56 4.08.579 4.747.272 6.015c-.355 1.454-.37 2.361 0 3.88.274 1.13.93 1.935 2.05 1.935H3.65v-1.744c0-1.26 1.102-2.372 2.41-2.372h3.855c1.073 0 1.93-.873 1.93-1.94V2.14c0-1.034-.882-1.812-1.93-1.984-.663-.11-1.35-.159-2.01-.156M5.818 1.17a.728.728 0 0 1 0 1.455.727.727 0 0 1 0-1.455"
      />
      <path
        fill="currentColor"
        d="M12.326 4.08v1.695c0 1.314-1.126 2.42-2.41 2.42H6.06c-1.055 0-1.93.894-1.93 1.94v3.634c0 1.035.91 1.643 1.93 1.94 1.222.355 2.394.42 3.855 0 .972-.278 1.93-.838 1.93-1.94v-1.454H7.99v-.485h5.785c1.121 0 1.54-.774 1.93-1.936.402-1.195.385-2.345 0-3.88-.278-1.103-.807-1.934-1.93-1.934zm-2.168 9.204a.727.727 0 0 1 0 1.455.728.728 0 0 1 0-1.455"
      />
    </svg>
  ),
);
LogoPythonMonochrome.displayName = "LogoPythonMonochrome";

export { LogoPythonMonochrome };
export default LogoPythonMonochrome;
