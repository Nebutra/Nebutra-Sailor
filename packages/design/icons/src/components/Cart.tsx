import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Cart = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M0 2.5h.958c.452 0 .864.243 1.085.628L2.5 4.5l1.43 4.29a2.5 2.5 0 0 0 2.372 1.71h6.149a2.5 2.5 0 0 0 2.45-2.01L15.7 4.5 16 3H3.623l-.12-.293A2.75 2.75 0 0 0 .958 1H0zm4.081 2 1.272 3.816A1 1 0 0 0 6.302 9h6.149a1 1 0 0 0 .98-.804l.74-3.696H4.08M12.5 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m-8-1.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0"
      clipRule="evenodd"
    />
  </svg>
));
Cart.displayName = "Cart";

export { Cart };
export default Cart;
