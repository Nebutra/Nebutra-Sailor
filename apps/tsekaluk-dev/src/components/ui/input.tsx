import * as React from "react";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className: _className, type, ...props }, ref) => (
    <input data-allow-native type={type} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
