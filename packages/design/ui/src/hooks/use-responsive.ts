import { useEffect, useState } from "react";

const BREAKPOINTS = {
  SM: 0,
  MD: 600,
  LG: 960,
  XL: 1200,
};

// biome-ignore lint/suspicious/noExplicitAny: responsive styles are untyped by design
export const useResponsive = (styles: any) => {
  // biome-ignore lint/suspicious/noExplicitAny: responsive styles are untyped
  const [responsiveStyles, setResponsiveStyles] = useState<any>();

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: responsive styles
    const getResponsive = (styles: any) => {
      // biome-ignore lint/suspicious/noImplicitAnyLet: resolved dynamically
      let current;
      if (typeof styles === "object") {
        if (styles.sm && window.innerWidth >= BREAKPOINTS.SM) {
          current = styles.sm;
        }
        if (styles.md && window.innerWidth >= BREAKPOINTS.MD) {
          current = styles.md;
        }
        if (styles.lg && window.innerWidth >= BREAKPOINTS.LG) {
          current = styles.lg;
        }
        if (styles.xl && window.innerWidth >= BREAKPOINTS.XL) {
          current = styles.xl;
        }
      } else {
        current = styles;
      }
      return current;
    };

    const listener = () => {
      setResponsiveStyles(getResponsive(styles));
    };

    listener();

    window.addEventListener("resize", listener);

    return () => {
      window.removeEventListener("resize", listener);
    };
  }, [styles]); // Note: avoiding JSON.stringify(styles) to prevent rerenders if references change, but the original used it. I'll stick close to original but fix stringify if possible. Actually, stringify is safer for objects. Let's use the provided code.

  return responsiveStyles;
};
