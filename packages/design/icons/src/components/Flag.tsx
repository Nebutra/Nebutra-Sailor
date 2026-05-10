import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Flag = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M2.5 2.384a5.583 5.583 0 0 1 3-.884c.868 0 1.517.417 2.264.976l.153.114c.316.238.668.504 1.032.71.438.25.951.45 1.551.45.977 0 2.008-.282 2.759-.541q.125-.043.241-.086V8.82q-.202.107-.518.233c-.57.222-1.4.448-2.425.448-.906 0-1.443-.328-2.13-.76l-.022-.014c-.7-.44-1.552-.976-2.905-.976a7.1 7.1 0 0 0-3 .674zm0 7.75V16H1V1.652l.266-.225L1.75 2l-.484-.573.002-.001.002-.002.007-.006.02-.016.066-.052q.084-.065.234-.167A7.082 7.082 0 0 1 5.5 0c1.404 0 2.404.708 3.162 1.274l.169.127c.321.241.586.44.859.595.303.173.558.254.81.254.727 0 1.572-.218 2.27-.459a13 13 0 0 0 1.134-.457l.014-.007h.003v-.001L15 .799V9.64l-.318.223-.432-.613c.432.613.431.613.431.614h-.001l-.003.003-.007.004-.02.014-.065.042q-.081.052-.228.135a7 7 0 0 1-.828.386 8.2 8.2 0 0 1-2.972.552c-1.353 0-2.204-.535-2.905-.976l-.023-.014c-.687-.432-1.224-.76-2.129-.76a5.6 5.6 0 0 0-3 .884m-.268.19"
      clipRule="evenodd"
    />
  </svg>
));
Flag.displayName = "Flag";

export { Flag };
export default Flag;
