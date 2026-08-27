import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Webhook = forwardRef<SVGSVGElement, IconProps>(
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
        d="M5.835 3.25a2.5 2.5 0 0 0 .915 3.415l.645.372-.368.648L5.146 11q.102.231.104.5a1.25 1.25 0 1 1-1.409-1.24L5.39 7.532a4.001 4.001 0 1 1 6.2-1.266l-1.094-1.928a2.5 2.5 0 0 0-4.66-1.088M9.146 5q.102-.231.104-.5a1.25 1.25 0 1 0-1.409 1.24l1.882 3.316.373.657.654-.378a2.5 2.5 0 1 1 .16 4.415H8.693a4 4 0 1 0 1.997-6.03zm4.104 6.5a1.25 1.25 0 0 1-2.25.75H7.93a4.001 4.001 0 1 1-4.255-4.737L2.581 9.441A2.5 2.5 0 1 0 6.5 11.5v-.75H11a1.25 1.25 0 0 1 2.25.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Webhook.displayName = "Webhook";

export { Webhook };
export default Webhook;
