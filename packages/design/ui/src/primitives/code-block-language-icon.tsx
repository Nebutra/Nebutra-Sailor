import {
  SiBun,
  SiBunHex,
  SiC,
  SiCHex,
  SiCplusplus,
  SiCplusplusHex,
  SiCss,
  SiCssHex,
  SiDotnet,
  SiDotnetHex,
  SiGnubash,
  SiGnubashHex,
  SiGo,
  SiGoHex,
  SiGraphql,
  SiGraphqlHex,
  SiHtml5,
  SiHtml5Hex,
  SiJavascript,
  SiJavascriptHex,
  SiKotlin,
  SiKotlinHex,
  SiMarkdown,
  SiMarkdownHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiOpenjdk,
  SiOpenjdkHex,
  SiPhp,
  SiPhpHex,
  SiPython,
  SiPythonHex,
  SiReact,
  SiReactHex,
  SiRuby,
  SiRubyHex,
  SiRust,
  SiRustHex,
  SiSass,
  SiSassHex,
  SiSvelte,
  SiSvelteHex,
  SiSwift,
  SiSwiftHex,
  SiTypescript,
  SiTypescriptHex,
  SiVuedotjs,
  SiVuedotjsHex,
  SiYaml,
  SiYamlHex,
} from "@icons-pack/react-simple-icons";
import type { ElementType, ReactElement, ReactNode, SVGProps } from "react";
import { isValidElement } from "react";
import { cn } from "../utils";

export type CodeBlockLanguageIconComponent = ElementType<
  SVGProps<SVGSVGElement> & {
    color?: string;
    size?: number | string;
    title?: string;
  }
>;

export type CodeBlockLanguageIconElement = ReactElement<{
  className?: string;
  color?: string;
  size?: number | string;
}>;

export type CodeBlockLanguageIconValue =
  | CodeBlockLanguageIconComponent
  | CodeBlockLanguageIconElement
  | false
  | null;

export type CodeBlockLanguageIconMap = Partial<
  Record<string, CodeBlockLanguageIconValue | undefined>
>;

type LanguageIconSpec = {
  color: string;
  icon: CodeBlockLanguageIconComponent;
  label: string;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "bash",
  bun: "bun",
  c: "c",
  "c++": "cpp",
  "c#": "csharp",
  cpp: "cpp",
  cs: "csharp",
  csharp: "csharp",
  cxx: "cpp",
  css: "css",
  go: "go",
  gql: "graphql",
  graphql: "graphql",
  htm: "html",
  html: "html",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  jsx: "react",
  kotlin: "kotlin",
  kt: "kotlin",
  markdown: "markdown",
  md: "markdown",
  node: "node",
  "node.js": "node",
  nodejs: "node",
  php: "php",
  py: "python",
  python: "python",
  rb: "ruby",
  react: "react",
  rs: "rust",
  ruby: "ruby",
  rust: "rust",
  sass: "sass",
  scss: "sass",
  sh: "bash",
  svelte: "svelte",
  swift: "swift",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  vue: "vue",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash",
};

/**
 * A clear `{ }` braces glyph for JSON/config files — the official simple-icons
 * JSON mark renders as a single dark blob that's unrecognizable at icon sizes.
 */
type JsonBracesIconProps = SVGProps<SVGSVGElement> & {
  color?: string | undefined;
  size?: number | string | undefined;
  title?: string | undefined;
};

function JsonBracesIcon({
  className,
  color,
  size: _size,
  title,
  ...svgProps
}: JsonBracesIconProps) {
  return (
    <svg
      {...svgProps}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {title ? <title>{title}</title> : null}
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
      <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

const LANGUAGE_ICON_REGISTRY: Record<string, LanguageIconSpec> = {
  bash: { color: SiGnubashHex, icon: SiGnubash, label: "Bash" },
  bun: { color: SiBunHex, icon: SiBun, label: "Bun" },
  c: { color: SiCHex, icon: SiC, label: "C" },
  csharp: { color: SiDotnetHex, icon: SiDotnet, label: "C#" },
  cpp: { color: SiCplusplusHex, icon: SiCplusplus, label: "C++" },
  css: { color: SiCssHex, icon: SiCss, label: "CSS" },
  go: { color: SiGoHex, icon: SiGo, label: "Go" },
  graphql: { color: SiGraphqlHex, icon: SiGraphql, label: "GraphQL" },
  html: { color: SiHtml5Hex, icon: SiHtml5, label: "HTML" },
  java: { color: SiOpenjdkHex, icon: SiOpenjdk, label: "Java" },
  javascript: { color: SiJavascriptHex, icon: SiJavascript, label: "JavaScript" },
  json: { color: "currentColor", icon: JsonBracesIcon, label: "JSON" },
  kotlin: { color: SiKotlinHex, icon: SiKotlin, label: "Kotlin" },
  markdown: { color: SiMarkdownHex, icon: SiMarkdown, label: "Markdown" },
  node: { color: SiNodedotjsHex, icon: SiNodedotjs, label: "Node.js" },
  php: { color: SiPhpHex, icon: SiPhp, label: "PHP" },
  python: { color: SiPythonHex, icon: SiPython, label: "Python" },
  react: { color: SiReactHex, icon: SiReact, label: "React" },
  ruby: { color: SiRubyHex, icon: SiRuby, label: "Ruby" },
  rust: { color: SiRustHex, icon: SiRust, label: "Rust" },
  sass: { color: SiSassHex, icon: SiSass, label: "Sass" },
  svelte: { color: SiSvelteHex, icon: SiSvelte, label: "Svelte" },
  swift: { color: SiSwiftHex, icon: SiSwift, label: "Swift" },
  typescript: { color: SiTypescriptHex, icon: SiTypescript, label: "TypeScript" },
  vue: { color: SiVuedotjsHex, icon: SiVuedotjs, label: "Vue" },
  yaml: { color: SiYamlHex, icon: SiYaml, label: "YAML" },
};

export function normalizeCodeBlockLanguage(language?: string | null): string {
  const trimmed = language?.trim().toLowerCase();
  if (!trimmed) return "";

  const withoutPrefix = trimmed.replace(/^language-/, "");
  const extension = withoutPrefix.includes(".") ? withoutPrefix.split(".").pop() : undefined;
  const candidate = extension || withoutPrefix;

  return LANGUAGE_ALIASES[candidate] || candidate;
}

function getMapOverride(
  language: string | null | undefined,
  icons: CodeBlockLanguageIconMap | undefined,
): CodeBlockLanguageIconValue | undefined {
  if (!icons) return undefined;
  const raw = language?.trim().toLowerCase();
  const normalized = normalizeCodeBlockLanguage(language);
  if (raw && Object.hasOwn(icons, raw)) return icons[raw];
  if (normalized && Object.hasOwn(icons, normalized)) return icons[normalized];
  return undefined;
}

export function resolveCodeBlockLanguageIcon(
  language?: string | null,
  options: {
    icon?: CodeBlockLanguageIconValue | undefined;
    icons?: CodeBlockLanguageIconMap | undefined;
  } = {},
) {
  const normalized = normalizeCodeBlockLanguage(language);
  const override = options.icon ?? getMapOverride(language, options.icons);

  if (override === false || override === null) return null;
  if (override) {
    return {
      color: undefined,
      icon: override,
      language: normalized,
      label: normalized || language || "code",
    };
  }

  const spec = LANGUAGE_ICON_REGISTRY[normalized];
  if (!spec) return null;

  return {
    ...spec,
    language: normalized,
  };
}

export interface CodeBlockLanguageIconProps {
  className?: string;
  fallback?: ReactNode | undefined;
  icon?: CodeBlockLanguageIconValue | undefined;
  icons?: CodeBlockLanguageIconMap | undefined;
  language?: string | null | undefined;
}

export function CodeBlockLanguageIcon({
  className,
  fallback,
  icon,
  icons,
  language,
}: CodeBlockLanguageIconProps) {
  const resolved = resolveCodeBlockLanguageIcon(language, { icon, icons });

  if (!resolved) return fallback ?? null;

  const Icon = resolved.icon;

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", className)}
      data-code-block-language-icon
      data-language={resolved.language}
      title={resolved.label}
    >
      {isValidElement(Icon) ? (
        Icon
      ) : (
        <Icon
          aria-hidden="true"
          className="size-full"
          focusable="false"
          {...(resolved.color ? { color: resolved.color } : {})}
        />
      )}
    </span>
  );
}
