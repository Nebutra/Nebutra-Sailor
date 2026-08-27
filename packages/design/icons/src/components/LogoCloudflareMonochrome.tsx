import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoCloudflareMonochrome = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10.944 11.008a.91.91 0 0 0-.096-.832 1 1 0 0 0-.672-.352L4.608 9.76c-.032 0-.064-.032-.096-.032a.06.06 0 0 1 0-.096c.032-.064.064-.096.128-.096l5.6-.064a2.01 2.01 0 0 0 1.632-1.216l.32-.832c0-.032.032-.064 0-.096a3.647 3.647 0 0 0-7.008-.384 1.75 1.75 0 0 0-1.152-.32A1.67 1.67 0 0 0 2.56 8.096c-.021.192-.01.387.032.576A2.337 2.337 0 0 0 .32 11.008q-.007.178.032.352a.1.1 0 0 0 .096.096H10.72c.064 0 .128-.032.128-.096zM12.704 7.424h-.16c-.032 0-.064.032-.096.064l-.224.768a.91.91 0 0 0 .096.832 1 1 0 0 0 .672.352l1.184.064c.032 0 .064.032.096.032a.06.06 0 0 1 .024.048.06.06 0 0 1-.024.048c-.032.064-.064.096-.128.096l-1.216.064a2.01 2.01 0 0 0-1.632 1.216l-.064.288c-.032.032 0 .096.064.096h4.224a.08.08 0 0 0 .072-.024.09.09 0 0 0 .024-.072q.114-.408.128-.832a3.06 3.06 0 0 0-3.04-3.04"
      />
    </svg>
  ),
);
LogoCloudflareMonochrome.displayName = "LogoCloudflareMonochrome";

export { LogoCloudflareMonochrome };
export default LogoCloudflareMonochrome;
