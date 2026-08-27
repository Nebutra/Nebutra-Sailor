import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const BrowserOpera = forwardRef<SVGSVGElement, IconProps>(
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
        d="M.125 8A7.875 7.875 0 0 1 8 .125h.029a7.85 7.85 0 0 1 5.22 2.005A7.86 7.86 0 0 1 15.875 8a7.86 7.86 0 0 1-2.627 5.87 7.85 7.85 0 0 1-5.623 1.996A7.875 7.875 0 0 1 .125 8M8 1.375a6.625 6.625 0 0 0-.316 13.242 7 7 0 0 0 .421.007c-1.18-.391-2.209-1.15-2.978-2.145-.901-1.07-1.456-2.608-1.494-4.294v-.37c.038-1.685.593-3.223 1.494-4.293.77-.995 1.798-1.755 2.978-2.146H8m4.449 1.717a4.6 4.6 0 0 0-2.925-.742c.692.317 1.293.85 1.763 1.508.776 1.085 1.236 2.551 1.236 4.142s-.46 3.058-1.236 4.143c-.47.658-1.07 1.19-1.762 1.507q.2.018.401.018c.916 0 1.777-.275 2.523-.76a6.6 6.6 0 0 0 2.176-4.907 6.6 6.6 0 0 0-2.176-4.91m-4.372.189c-.715 0-1.411.358-1.987 1.037-.695.82-1.174 2.073-1.208 3.519v.327c.034 1.445.513 2.697 1.209 3.518.575.68 1.272 1.038 1.986 1.038.801 0 1.585-.453 2.194-1.304.607-.85 1.002-2.055 1.002-3.416s-.395-2.566-1.002-3.415C9.662 3.734 8.878 3.28 8.077 3.28"
        clipRule="evenodd"
      />
    </svg>
  ),
);
BrowserOpera.displayName = "BrowserOpera";

export { BrowserOpera };
export default BrowserOpera;
