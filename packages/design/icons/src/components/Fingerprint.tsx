import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Fingerprint = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4628_1818)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M15.093 7.649A7.416 7.416 0 0 0 2.65 2.674l1.02 1.099a5.916 5.916 0 0 1 9.927 3.97c.067 1.07.464 2.36 1.538 3.087l.84-1.242c-.52-.352-.827-1.083-.88-1.939M1.22 4.489a7.4 7.4 0 0 0-.93 4.085c.125 1.99.411 3.96.853 5.892l1.463-.335a35 35 0 0 1-.818-5.65 5.9 5.9 0 0 1 .74-3.258zM11.931 8.15a4.152 4.152 0 0 0-8.287.518q.068 1.095.21 2.177l1.488-.195a31 31 0 0 1-.201-2.076 2.652 2.652 0 0 1 5.293-.33q.059.92.182 1.83l1.486-.202a24 24 0 0 1-.17-1.722m1.071 5.725a24 24 0 0 1-.623-2.384l-1.469.304q.248 1.195.608 2.36zM14.65 24.82l-3.8.748a4.14 4.14 0 0 0 3.8-.748m-9.852-9.4a32 32 0 0 1-.649-2.743l1.474-.28a31 31 0 0 0 .655 2.744zm3.319-.625-.039-.13v-.004a30 30 0 0 1-1.135-6.504.75.75 0 0 1 1.497-.093c.131 2.1.494 4.171 1.077 6.177v.001l.081.273z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_4628_1818">
          <path
            fill="#fff"
            d="M0 0h16v16H0z"
            style={{
              fill: "#fff",
              fillOpacity: 1,
            }}
          />
        </clipPath>
      </defs>
    </svg>
  ),
);
Fingerprint.displayName = "Fingerprint";

export { Fingerprint };
export default Fingerprint;
