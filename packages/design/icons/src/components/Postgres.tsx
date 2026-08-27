import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Postgres = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.807 0C6.052 0 4.078 1.005 2.804 2.508 1.55 3.989 1.03 5.888 1.03 7.609v4.094c0 .975.177 1.77.518 2.405.345.643.834 1.079 1.38 1.364C3.94 16 5.154 16 5.939 16h.811v-.75c0-.279.001-.727.09-1.182.09-.471.252-.83.48-1.03l.102-.09c.23-.2.526-.458.765-.745.154-.186.306-.408.413-.668 1.76-.052 3.338-.355 4.493-1.36 1.308-1.14 1.887-3.006 1.887-5.75V.75h-.75.75V0H8.808m-2.36 11.808c.158-.138.297-.26.418-.38a8 8 0 0 1-1.177-.324 9 9 0 0 1-1.012-.427l-.018-.01-.005-.002-.002-.001H4.65L5 10l-.35.663-.664-.35.701-1.327.662.35h.001l.009.005a3 3 0 0 0 .208.1c.149.067.363.157.62.248.524.185 1.183.354 1.813.354 1.958 0 3.267-.267 4.108-1 .816-.711 1.372-2.028 1.372-4.617V1.5H8.808c-2.356 0-3.896.842-4.858 1.978-.98 1.157-1.42 2.688-1.42 4.131v4.094c0 .798.146 1.334.34 1.696.19.354.447.584.752.743.472.246 1.048.323 1.653.347a6 6 0 0 1 .093-.706c.115-.594.365-1.345.961-1.87zM6 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Postgres.displayName = "Postgres";

export { Postgres };
export default Postgres;
