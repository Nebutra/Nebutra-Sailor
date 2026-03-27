// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["framer-motion"],
              message:
                "Import framer-motion via @nebutra/ui/components (AnimateIn, AnimateInGroup) — direct framer-motion imports bypass LazyMotion and inflate bundle size.",
            },
            {
              group: ["@nebutra/*/*/*"],
              message:
                "Do not use deep @nebutra package paths. Import from the package root (e.g. @nebutra/ui/components).",
            },
          ],
        },
      ],
    },
  },
];

export default config;
