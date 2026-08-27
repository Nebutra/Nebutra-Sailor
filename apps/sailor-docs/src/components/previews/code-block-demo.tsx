import { CodeBlock } from "@nebutra/ui/primitives";

export function CodeBlockDemo() {
  const codeFiles = [
    {
      title: "button.tsx",
      language: "tsx",
      code: `import { Button } from "@/components/ui/button"

export function ButtonDemo() {
  return (
    <Button variant="default" size="lg">
      Click me
    </Button>
  )
}`,
      highlightedLines: [4, 5, 6],
    },
    {
      title: "tailwind.config.ts",
      language: "typescript",
      code: `import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config`,
      addedLines: [15],
      removedLines: [11],
    },
  ];

  return (
    <div className="max-w-3xl p-8 mx-auto w-full">
      <CodeBlock
        files={codeFiles}
        defaultTitle="button.tsx"
        showLineNumbers={true}
        showLanguageSwitcher={true}
      />
    </div>
  );
}
