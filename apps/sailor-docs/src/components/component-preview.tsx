"use client";

import { Check, Copy } from "@nebutra/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { MessageSquare, Moon, Sun, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";

const REGISTRY_BASE = "https://design.nebutra.com/r";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Index } from "@/__registry__";

interface ComponentPreviewProps {
  children?: ReactNode;
  code?: string;
  className?: string;
  name?: string;
}

function PreviewSkeleton() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
    </div>
  );
}

function generateIntegrationPrompt(_name: string, code: string): string {
  return `You are given a task to integrate an existing Nebutra UI component into a React codebase.

The codebase uses:
- @nebutra/ui component library (Radix UI primitives + Nebutra design system)
- Tailwind CSS v4 with semantic CSS variable tokens
- TypeScript
- Next.js 16 App Router

If the project is not set up yet, run:
  pnpm add @nebutra/ui @nebutra/tokens @nebutra/icons

Copy-paste this component to the appropriate location in your project:
\`\`\`tsx
${code}
\`\`\`

Key integration notes:
- Import UI primitives from \`@nebutra/ui/primitives\`
- Import icons from \`@nebutra/icons\` (Geist) or \`lucide-react\` (generic)
- Use \`cn()\` from \`@nebutra/ui/utils\` for class merging
- Use CSS variable tokens for colors: \`var(--neutral-1)\`, \`var(--blue-9)\`, \`var(--brand-gradient)\`
- Add \`"use client"\` directive for interactive components
- Wrap with \`<ThemeProvider>\` from \`@nebutra/tokens\` at your app root if not already present

Steps to integrate:
1. Copy the component code above to your project
2. Ensure \`@nebutra/ui\` is installed (\`pnpm add @nebutra/ui @nebutra/tokens\`)
3. Import and use the component where needed
4. Pass any required props documented in the component's props interface
5. Verify the component renders correctly in both light and dark modes`;
}

function useClipboard() {
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!hasCopied) return;
    const t = setTimeout(() => setHasCopied(false), 2000);
    return () => clearTimeout(t);
  }, [hasCopied]);

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setHasCopied(true);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setHasCopied(true);
      } catch {
        // Both methods failed
      }
    }
  }, []);

  return { hasCopied, copy };
}

function CopyButton({ value }: { value: string }) {
  const { hasCopied, copy } = useClipboard();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className="p-2 backdrop-blur inline-flex items-center justify-center rounded-md border bg-muted/50 text-muted-foreground transition-opacity hover:bg-muted"
      aria-label="Copy code to clipboard"
    >
      {hasCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function InstallButton({ name }: { name: string }) {
  const { hasCopied, copy } = useClipboard();
  const cmd = `npx shadcn@latest add ${REGISTRY_BASE}/${name}.json`;
  return (
    <button
      type="button"
      onClick={() => copy(cmd)}
      className="p-2 backdrop-blur inline-flex items-center justify-center rounded-md border bg-muted/50 text-muted-foreground transition-opacity hover:bg-muted"
      aria-label="Copy install command"
      title="Copy install command"
    >
      {hasCopied ? <Check className="h-4 w-4 text-primary" /> : <Terminal className="h-4 w-4" />}
    </button>
  );
}

function InstallTab({ name }: { name: string }) {
  const cmd = `npx shadcn@latest add ${REGISTRY_BASE}/${name}.json`;
  const depCmd = `pnpm add @nebutra/ui @nebutra/tokens @nebutra/icons`;
  const { hasCopied: cmdCopied, copy: copyCmd } = useClipboard();
  const { hasCopied: depCopied, copy: copyDep } = useClipboard();
  return (
    <div className="space-y-5 p-6 text-sm">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Install via CLI
        </p>
        <div className="gap-2 bg-zinc-950 px-4 py-3 text-xs text-zinc-100 flex items-center rounded-lg border font-mono">
          <span className="flex-1 overflow-x-auto whitespace-nowrap select-all">{cmd}</span>
          <button
            type="button"
            onClick={() => copyCmd(cmd)}
            className="ml-2 text-zinc-400 hover:text-zinc-100 shrink-0 transition-colors"
            aria-label="Copy install command"
          >
            {cmdCopied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Or install dependencies manually
        </p>
        <div className="gap-2 bg-zinc-950 px-4 py-3 text-xs text-zinc-100 flex items-center rounded-lg border font-mono">
          <span className="flex-1 overflow-x-auto whitespace-nowrap select-all">{depCmd}</span>
          <button
            type="button"
            onClick={() => copyDep(depCmd)}
            className="ml-2 text-zinc-400 hover:text-zinc-100 shrink-0 transition-colors"
            aria-label="Copy dependency install command"
          >
            {depCopied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptButton({ name, code }: { name: string; code: string }) {
  const { hasCopied, copy } = useClipboard();
  return (
    <button
      type="button"
      onClick={() => copy(generateIntegrationPrompt(name, code))}
      className="p-2 backdrop-blur inline-flex items-center justify-center rounded-md border bg-muted/50 text-muted-foreground transition-opacity hover:bg-muted"
      aria-label="Copy integration prompt for AI"
      title="Copy prompt"
    >
      {hasCopied ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
    </button>
  );
}

export function ComponentPreview({ children, name, code, className }: ComponentPreviewProps) {
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  // 1. Resolve component from registry
  const Demo = name
    ? (Index as Record<string, { component: React.ComponentType }>)[name]?.component
    : null;

  // 2. Determine preview content:
  //    - Registry component takes priority when name matches
  //    - Children are fallback for inline preview content in MDX
  const preview = Demo ? (
    <Suspense fallback={<PreviewSkeleton />}>
      <Demo />
    </Suspense>
  ) : (
    (children ?? null)
  );

  const hasCode = !!code;

  const themeToggle = (
    <>
      <button
        type="button"
        onClick={() => setPreviewTheme("light")}
        className={cn(
          "p-1.5 inline-flex items-center justify-center rounded-md transition-colors",
          previewTheme === "light"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label="Light theme"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setPreviewTheme("dark")}
        className={cn(
          "p-1.5 inline-flex items-center justify-center rounded-md transition-colors",
          previewTheme === "dark"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label="Dark theme"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </>
  );

  // No code → just show the preview
  if (!hasCode) {
    return (
      <div className="my-8 overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
        <div className="relative">
          <div
            className={cn(
              "not-prose p-10 relative flex min-h-[350px] w-full flex-wrap items-center justify-center",
              "bg-[radial-gradient(var(--neutral-6)_1px,transparent_1px)] [background-size:16px_16px]",
              previewTheme === "dark" ? "dark bg-zinc-950" : "bg-white",
              className,
            )}
          >
            {preview}
          </div>
          <div className="top-2 right-2 gap-1 absolute flex">{themeToggle}</div>
        </div>
      </div>
    );
  }

  // Preview + Code tabs
  return (
    <Tabs
      defaultValue="preview"
      className="my-8 relative w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm ring-1 ring-ring/10"
    >
      <div className="px-4 h-13 flex items-center justify-between border-b border-border/80 bg-muted/30">
        <TabsList
          variant="default"
          size="sm"
          className="bg-accent/50 transition-colors hover:bg-accent/80"
        >
          <TabsTrigger value="preview" className="px-3">
            Preview
          </TabsTrigger>
          <TabsTrigger value="code" className="px-3">
            Code
          </TabsTrigger>
          {name && (
            <TabsTrigger value="install" className="px-3">
              Install
            </TabsTrigger>
          )}
        </TabsList>
        <div className="gap-2 flex items-center">
          {themeToggle}
          {name && <InstallButton name={name} />}
          {name && code && <PromptButton name={name} code={code} />}
          <CopyButton value={code} />
        </div>
      </div>

      <TabsContent value="preview" className="m-0 border-none">
        <div
          className={cn(
            "not-prose p-10 relative flex min-h-[350px] w-full flex-wrap items-center justify-center",
            "bg-[radial-gradient(var(--neutral-6)_1px,transparent_1px)] [background-size:16px_16px]",
            previewTheme === "dark" ? "dark bg-zinc-950" : "bg-white",
            className,
          )}
        >
          {preview}
        </div>
      </TabsContent>

      <TabsContent value="code" className="m-0 bg-zinc-950 dark:bg-zinc-950/50 border-none">
        <div className="[&_figure]:m-0 max-h-[600px] w-full overflow-hidden overflow-y-auto [&_figure]:rounded-none [&_figure]:border-0 [&_pre]:bg-transparent">
          <DynamicCodeBlock lang="tsx" code={code} />
        </div>
      </TabsContent>

      {name && (
        <TabsContent value="install" className="m-0 border-none">
          <InstallTab name={name} />
        </TabsContent>
      )}
    </Tabs>
  );
}
