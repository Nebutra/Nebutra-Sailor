import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoGeist = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m.971.757.6 1 .858-.514-.6-1zm-2.542 1 .6-1-.858-.514-.6 1zm3.742 1 .6 1 .858-.514-.6-1zm-4.942 1 .6-1-.858-.514-.6 1zm6.142 1 .6 1 .858-.514-.6-1zm-7.342 1 .6-1-.858-.514-.6 1zm8.542 1 .6 1 .858-.514-.6-1zm-9.742 1 .6-1-.858-.514-.6 1zM3 13.5c0 .313-.096.604-.26.845v.155h-.122a1.5 1.5 0 1 1 .382-1m.925 1H5.11v-1H3.925zm2.37 0h1.186v-1H6.296zm2.371 0h1.185v-1H8.666zm2.37 0h1.186v-1h-1.185zm3.464.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoGeist.displayName = "LogoGeist";

export { LogoGeist };
export default LogoGeist;
