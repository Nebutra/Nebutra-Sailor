import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoRust = forwardRef<SVGSVGElement, IconProps>(
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
        stroke="currentColor"
        strokeWidth={0.151}
        d="M6.717 5.811H8.68c1.208 0 1.208 1.208 0 1.208H6.717zm-4.68 5.585h6.039v-1.66H6.717V8.528h1.51c1.66 0 .754 2.868 2.113 2.868h3.773V8.528h-.905v.302a.77.77 0 0 1-1.51.302c-.15-.755-.755-1.358-.905-1.358 2.264-1.208.905-3.623-.906-3.623H2.793v1.66h1.509v3.925H2.038z"
      />
      <path
        fill="transparent"
        stroke="currentColor"
        strokeWidth={1.358}
        d="M8 14.49A6.49 6.49 0 1 0 8 1.51a6.49 6.49 0 0 0 0 12.98Z"
      />
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.453}
        d="M14.944 8.453 15.698 8l-.754-.453zM14.722 9.799l.828-.297-.652-.592zM14.242 11.076l.87-.13-.524-.707zM13.522 12.234l.879.043-.376-.796zM12.59 13.23l.853.213-.213-.854zM11.481 14.025l.796.376-.043-.88zM10.239 14.588l.707.524.13-.87zM8.91 14.898l.592.652.297-.828zM7.547 14.943l.453.755.453-.755zM6.201 14.722l.297.828.592-.652zM4.925 14.242l.13.87.706-.524zM3.766 13.522l-.043.879.796-.376zM2.77 12.59l-.213.853.854-.213zM1.975 11.481l-.376.796.88-.043zM1.412 10.239l-.524.707.87.13zM1.102 8.91l-.652.592.829.297zM1.057 7.547.302 8l.755.453zM1.278 6.201l-.828.297.652.592zM1.758 4.925l-.87.13.524.706zM2.479 3.766l-.88-.043.376.796zM3.41 2.77l-.853-.213.213.853zM4.52 1.975 3.722 1.6l.043.88zM5.761 1.412 5.054.888l-.13.87zM7.09 1.102 6.498.45l-.297.828zM8.453 1.057 8 .302l-.453.755zM9.799 1.278 9.502.45l-.591.652zM11.076 1.758l-.13-.87-.707.524zM12.234 2.478l.043-.879-.796.376zM13.23 3.41l.213-.853-.853.213zM14.025 4.519l.376-.796-.88.043zM14.588 5.761l.524-.707-.87-.13zM14.898 7.09l.652-.592-.828-.297z"
      />
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.906}
        d="M6.943 1.66 8 2.717 9.057 1.66zM13.703 5.036l-.679 1.331 1.332.679zM12.581 12.508l-1.476-.234-.234 1.476zM5.128 13.75l-.233-1.476-1.476.234zM1.644 7.046l1.331-.679-.678-1.33z"
      />
    </svg>
  ),
);
LogoRust.displayName = "LogoRust";

export { LogoRust };
export default LogoRust;
