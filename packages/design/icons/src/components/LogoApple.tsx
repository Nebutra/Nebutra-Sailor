import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoApple = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.473 12.022c-.553.827-1.14 1.633-2.033 1.647-.893.02-1.18-.527-2.193-.527-1.02 0-1.334.514-2.18.547-.874.033-1.534-.88-2.094-1.687-1.14-1.647-2.013-4.68-.84-6.72.58-1.013 1.62-1.653 2.747-1.673.853-.014 1.667.58 2.193.58.52 0 1.507-.714 2.54-.607.434.02 1.647.173 2.427 1.32-.06.04-1.447.853-1.433 2.54.02 2.014 1.766 2.687 1.786 2.694-.02.046-.28.96-.92 1.886M8.667 1.355c.486-.553 1.293-.973 1.96-1 .086.78-.227 1.567-.694 2.127-.46.567-1.22 1.007-1.966.947-.1-.767.273-1.567.7-2.074"
      />
    </svg>
  ),
);
LogoApple.displayName = "LogoApple";

export { LogoApple };
export default LogoApple;
