import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AcronymSvg = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 20 16"
      ref={ref}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.5 2.25h15c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25h-15c-.69 0-1.25-.56-1.25-1.25v-9c0-.69.56-1.25 1.25-1.25M0 3.5A2.5 2.5 0 0 1 2.5 1h15A2.5 2.5 0 0 1 20 3.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 0 12.5zm4.25 3.375c0-.207.168-.375.375-.375H6V5H4.625a1.875 1.875 0 0 0 0 3.75.375.375 0 1 1 0 .75H3V11h1.625a1.875 1.875 0 0 0 0-3.75.375.375 0 0 1-.375-.375M9 5v3.586c0 .066.026.13.073.177l.427.426.427-.426A.25.25 0 0 0 10 8.586V5h1.5v3.586c0 .464-.184.909-.513 1.237l-.957.957-.53.53-.53-.53-.957-.957A1.75 1.75 0 0 1 7.5 8.586V5zm5.75 0a2.25 2.25 0 0 0-2.25 2.25v1.5A2.25 2.25 0 0 0 14.75 11H16c.69 0 1.25-.56 1.25-1.25v-.5C17.25 8.56 16.69 8 16 8h-.75v1.5h-.5a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 1 .75-.75h.5a.5.5 0 0 1 .5.5h1.5a2 2 0 0 0-2-2z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
AcronymSvg.displayName = "AcronymSvg";

export { AcronymSvg };
export default AcronymSvg;
