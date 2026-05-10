import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoDiscord = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#5865F2"
        d="M13.554 3.016A13.2 13.2 0 0 0 10.253 2a9 9 0 0 0-.423.86 12.3 12.3 0 0 0-3.664 0A9 9 0 0 0 5.744 2c-1.141.195-2.252.537-3.304 1.018C.351 6.108-.215 9.123.068 12.094a13.3 13.3 0 0 0 4.048 2.033 10 10 0 0 0 .867-1.399 8.6 8.6 0 0 1-1.365-.652q.173-.126.335-.251a9.51 9.51 0 0 0 8.094 0q.165.136.335.251a8.6 8.6 0 0 1-1.368.654 9.7 9.7 0 0 0 .867 1.396 13.2 13.2 0 0 0 4.051-2.03c.332-3.446-.568-6.433-2.379-9.08m-8.212 7.25c-.789 0-1.44-.715-1.44-1.596S4.53 7.067 5.34 7.067s1.456.722 1.442 1.603c-.014.88-.636 1.597-1.44 1.597m5.316 0c-.79 0-1.44-.715-1.44-1.596s.63-1.603 1.44-1.603 1.452.722 1.438 1.603c-.014.88-.634 1.597-1.438 1.597"
      />
    </svg>
  ),
);
LogoDiscord.displayName = "LogoDiscord";

export { LogoDiscord };
export default LogoDiscord;
