import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.tsx",
    server: "src/client.ts",
    posthog: "src/posthog.tsx",
    events: "src/events.ts",
    track: "src/track.ts",
    "umami-proxy": "src/umami-proxy.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "next/navigation"],
});
