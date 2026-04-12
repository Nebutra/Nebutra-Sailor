import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { findMonorepoRoot } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface GenerateOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: string;
  interactive?: boolean;
}

interface GenerateAppOptions extends GenerateOptions {
  template?: "nextjs";
  port?: number;
}

interface GenerateComponentOptions extends GenerateOptions {
  variants?: string;
  sizes?: string;
}

/**
 * Template for Next.js app (Next.js 16 + Tailwind v4)
 */
function getNextjsAppTemplate(appName: string): Record<string, string> {
  const pascalCase = appName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return {
    "package.json": `{
  "name": "@nebutra/${appName}",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@nebutra/ui": "workspace:*",
    "@nebutra/tokens": "workspace:*",
    "@nebutra/icons": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.3"
  }
}`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,
    "src/app/layout.tsx": `import type { Metadata } from "next";
import "@nebutra/tokens/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "${pascalCase}",
  description: "Built with Nebutra",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
    "src/app/page.tsx": `export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-12">
            Welcome to ${pascalCase}
          </h1>
          <p className="mt-2 text-neutral-11">
            Built with Nebutra, Next.js 16, and Tailwind v4
          </p>
        </div>
      </div>
    </main>
  );
}`,
    "src/app/globals.css": `@import "tailwindcss";

@theme {
  --color-*: var(--neutral-*);
}`,
  };
}

/**
 * Template for a new package
 */
function getPackageTemplate(packageName: string): Record<string, string> {
  return {
    "package.json": `{
  "name": "@nebutra/${packageName}",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.9.3",
    "tsup": "^8.0.0"
  }
}`,
    "tsconfig.json": `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}`,
    "src/index.ts": `/**
 * @nebutra/${packageName}
 *
 * A modular core package for the Nebutra platform.
 */

export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}`,
  };
}

/**
 * Template for a Hono API route
 */
function getHonoRouteTemplate(routePath: string): Record<string, string> {
  const routeVar = routePath.replace(/\//g, "_").replace(/-/g, "_");

  return {
    [`src/routes/${routePath}.ts`]: `import { Hono } from "hono";
import { z } from "zod";

type Env = {
  Variables: {
    tenantId?: string;
  };
};

const app = new Hono<Env>();

/**
 * GET /${routePath}
 * Retrieve ${routePath} data
 */
app.get("/", async (c) => {
  return c.json({
    message: "GET /${routePath}",
    data: [],
  });
});

/**
 * POST /${routePath}
 * Create a new ${routePath} record
 */
app.post("/", async (c) => {
  const body = await c.req.json();

  // Validate input with Zod
  const schema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
  });
  
  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: "Validation failed", details: result.error.format() }, 400);
  }

  const validated = result.data;

  return c.json(
    {
      id: crypto.randomUUID(),
      ...body,
    },
    { status: 201 }
  );
});

export default app;`,
  };
}

/**
 * Template for a UI component with Storybook story
 */
function getComponentTemplate(componentName: string): Record<string, string> {
  const fileName = componentName
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");

  const pascalCase = componentName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return {
    [`src/components/${fileName}.tsx`]: `import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@nebutra/ui/utils";

const ${fileName}Variants = cva(
  "rounded-lg border bg-white shadow-sm transition-colors",
  {
    variants: {
      variant: {
        default: "border-neutral-7 hover:shadow-md",
        primary: "border-blue-9 bg-blue-3",
      },
      size: {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-base",
        lg: "px-6 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface ${pascalCase}Props
  extends VariantProps<typeof ${fileName}Variants> {
  children: React.ReactNode;
  className?: string;
}

export function ${pascalCase}({
  variant,
  size,
  children,
  className,
}: ${pascalCase}Props) {
  return (
    <div className={cn(${fileName}Variants({ variant, size }), className)}>
      {children}
    </div>
  );
}`,
    [`src/components/${fileName}.stories.tsx`]: `import type { Meta, StoryObj } from "@storybook/react";
import { ${pascalCase} } from "./${fileName}";

const meta: Meta<typeof ${pascalCase}> = {
  title: "Primitives/${pascalCase}",
  component: ${pascalCase},
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ${pascalCase}>;

export const Default: Story = {
  args: {
    children: "Component content",
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary variant",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <${pascalCase} size="sm">Small</\${pascalCase}>
      <${pascalCase} size="md">Medium</\${pascalCase}>
      <${pascalCase} size="lg">Large</\${pascalCase}>
    </div>
  ),
};`,
  };
}

/**
 * Determine what files would be created (for dry-run and preview)
 */
async function getFilesToCreate(
  type: string,
  name: string,
  options: GenerateOptions,
): Promise<Array<{ path: string; size: number }>> {
  const root = findMonorepoRoot();
  const files: Array<{ path: string; size: number }> = [];

  let templates: Record<string, string> = {};

  switch (type) {
    case "app":
      templates = getNextjsAppTemplate(name);
      break;
    case "package":
      templates = getPackageTemplate(name);
      break;
    case "route":
      templates = getHonoRouteTemplate(name);
      break;
    case "component":
      templates = getComponentTemplate(name);
      break;
    default:
      throw new Error(`Unknown generate type: ${type}`);
  }

  for (const [filePath, content] of Object.entries(templates)) {
    const fullPath =
      type === "app"
        ? join(root, "apps", name, filePath)
        : type === "package"
          ? join(root, "packages", name, filePath)
          : join(root, "apps/api-gateway", filePath);

    files.push({
      path: fullPath,
      size: Buffer.byteLength(content),
    });
  }

  return files;
}

/**
 * Create files for the generated resource
 */
async function createFiles(type: string, name: string): Promise<Array<string>> {
  const root = findMonorepoRoot();
  const createdFiles: string[] = [];

  let templates: Record<string, string> = {};

  switch (type) {
    case "app":
      templates = getNextjsAppTemplate(name);
      break;
    case "package":
      templates = getPackageTemplate(name);
      break;
    case "route":
      templates = getHonoRouteTemplate(name);
      break;
    case "component":
      templates = getComponentTemplate(name);
      break;
    default:
      throw new Error(`Unknown generate type: ${type}`);
  }

  for (const [filePath, content] of Object.entries(templates)) {
    let fullPath: string;

    if (type === "app") {
      fullPath = join(root, "apps", name, filePath);
    } else if (type === "package") {
      fullPath = join(root, "packages", name, filePath);
    } else if (type === "component") {
      fullPath = join(root, "packages/ui", filePath);
    } else {
      fullPath = join(root, "apps/api-gateway", filePath);
    }

    // Create directory if it doesn't exist
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, "utf-8");
    createdFiles.push(fullPath);
  }

  return createdFiles;
}

/**
 * Generate app command
 */
export async function generateAppCommand(appName: string, options: GenerateAppOptions) {
  if (options.dryRun) {
    const files = await getFilesToCreate("app", appName, options);
    const output = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      type: "app",
      name: appName,
      location: `apps/${appName}`,
      files: files.map((f) => ({
        path: f.path,
        sizeBytes: f.size,
      })),
      instructions: [`cd apps/${appName}`, "pnpm install", "pnpm run dev"],
    };

    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  p.intro(pc.bgCyan(pc.black(" nebutra generate app ")));

  const spinner = logger.spinner();

  try {
    spinner.start(`Generating app ${pc.cyan(appName)}...`);

    const files = await createFiles("app", appName);

    spinner.stop(`Created app ${pc.cyan(appName)}`, 0);

    logger.success(`App created with ${files.length} files`);
    logger.info(`Next steps:`);
    logger.info(`  cd apps/${appName}`);
    logger.info(`  pnpm install`);
    logger.info(`  pnpm run dev`);

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner.stop(
      `Failed to generate app: ${error instanceof Error ? error.message : "Unknown error"}`,
      1,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Generate package command
 */
export async function generatePackageCommand(packageName: string, options: GenerateOptions) {
  if (options.dryRun) {
    const files = await getFilesToCreate("package", packageName, options);
    const output = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      type: "package",
      name: packageName,
      location: `packages/${packageName}`,
      files: files.map((f) => ({
        path: f.path,
        sizeBytes: f.size,
      })),
    };

    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  p.intro(pc.bgCyan(pc.black(" nebutra generate package ")));

  const spinner = logger.spinner();

  try {
    spinner.start(`Generating package ${pc.cyan(packageName)}...`);

    const files = await createFiles("package", packageName);

    spinner.stop(`Created package ${pc.cyan(packageName)}`, 0);

    logger.success(`Package created with ${files.length} files`);
    logger.info(`Next steps:`);
    logger.info(`  Edit packages/${packageName}/src/index.ts`);
    logger.info(`  Run: pnpm --filter @nebutra/${packageName} build`);

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner.stop(
      `Failed to generate package: ${error instanceof Error ? error.message : "Unknown error"}`,
      1,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Generate route command
 */
export async function generateRouteCommand(routePath: string, options: GenerateOptions) {
  if (options.dryRun) {
    const files = await getFilesToCreate("route", routePath, options);
    const output = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      type: "route",
      path: routePath,
      location: `apps/api-gateway/src/routes/${routePath}.ts`,
      files: files.map((f) => ({
        path: f.path,
        sizeBytes: f.size,
      })),
    };

    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  p.intro(pc.bgCyan(pc.black(" nebutra generate route ")));

  const spinner = logger.spinner();

  try {
    spinner.start(`Generating route ${pc.cyan(routePath)}...`);

    const files = await createFiles("route", routePath);

    spinner.stop(`Created route ${pc.cyan(routePath)}`, 0);

    logger.success(`Route created with ${files.length} files`);
    logger.info(`File: apps/api-gateway/src/routes/${routePath}.ts`);
    logger.info(`Add to your main app.ts: app.route("/${routePath}", routes)`);

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner.stop(
      `Failed to generate route: ${error instanceof Error ? error.message : "Unknown error"}`,
      1,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Generate component command
 */
export async function generateComponentCommand(
  componentName: string,
  options: GenerateComponentOptions,
) {
  if (options.dryRun) {
    const files = await getFilesToCreate("component", componentName, options);
    const output = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      type: "component",
      name: componentName,
      location: `packages/ui/src/components/`,
      files: files.map((f) => ({
        path: f.path,
        sizeBytes: f.size,
      })),
      nextSteps: [
        "Add export to packages/ui/src/components/index.ts",
        "Run: pnpm --filter @nebutra/ui typecheck",
        "View in Storybook: pnpm --filter @nebutra/storybook dev",
      ],
    };

    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    process.exit(ExitCode.DRY_RUN_OK);
  }

  p.intro(pc.bgCyan(pc.black(" nebutra generate component ")));

  const spinner = logger.spinner();

  try {
    spinner.start(`Generating component ${pc.cyan(componentName)}...`);

    const files = await createFiles("component", componentName);

    spinner.stop(`Created component ${pc.cyan(componentName)}`, 0);

    logger.success(`Component created with ${files.length} files`);
    logger.info(`Files created in packages/ui/src/components/`);
    logger.info(`Next steps:`);
    logger.info(`  1. Add export to packages/ui/src/components/index.ts`);
    logger.info(`  2. pnpm --filter @nebutra/ui typecheck`);
    logger.info(`  3. pnpm --filter @nebutra/storybook dev`);

    process.exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner.stop(
      `Failed to generate component: ${error instanceof Error ? error.message : "Unknown error"}`,
      1,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Register generate command with Commander
 */
export function registerGenerateCommand(program: any) {
  const generate = program
    .command("generate")
    .description("Scaffold a new app, package, route, or component")
    .alias("gen");

  generate
    .command("app <name>")
    .description("Scaffold a new Next.js app (Next.js 16 + Tailwind v4)")
    .option("--dry-run", "Preview changes without writing files")
    .option("--yes", "Skip all prompts")
    .option("--template <type>", "App template (default: nextjs)", "nextjs")
    .option("--port <number>", "Dev server port", "3000")
    .action(async (name: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await generateAppCommand(name, {
        ...options,
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
        interactive: process.stdin.isTTY,
      });
    });

  generate
    .command("package <name>")
    .description("Scaffold a new package (@nebutra/<name>)")
    .option("--dry-run", "Preview changes without writing files")
    .option("--yes", "Skip all prompts")
    .action(async (name: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await generatePackageCommand(name, {
        ...options,
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
      });
    });

  generate
    .command("route <path>")
    .description("Scaffold a Hono API route in api-gateway")
    .option("--dry-run", "Preview changes without writing files")
    .option("--yes", "Skip all prompts")
    .action(async (path: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await generateRouteCommand(path, {
        ...options,
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
      });
    });

  generate
    .command("component <name>")
    .description("Scaffold a UI component with Storybook story")
    .option("--dry-run", "Preview changes without writing files")
    .option("--yes", "Skip all prompts")
    .option("--variants <list>", "Comma-separated variant names (e.g., 'primary,secondary')")
    .option("--sizes <list>", "Comma-separated size names (e.g., 'sm,md,lg')")
    .action(async (name: string, options: any) => {
      const globalOptions = options.optsWithGlobals ? options.optsWithGlobals() : options;
      await generateComponentCommand(name, {
        ...options,
        dryRun: options.dryRun || false,
        yes: globalOptions.yes || false,
        variants: options.variants,
        sizes: options.sizes,
      });
    });
}
