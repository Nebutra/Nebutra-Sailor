import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SignIn = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 2.5H9.25V1H14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9.25v-1.5h4.25zM8.44 7.25 6.47 5.28l-.53-.53L7 3.69l.53.53 3.074 3.073a1 1 0 0 1 0 1.414L7.53 11.78l-.53.53-1.06-1.06.53-.53 1.97-1.97H1v-1.5h7.44"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SignIn.displayName = "SignIn";

export { SignIn };
export default SignIn;
