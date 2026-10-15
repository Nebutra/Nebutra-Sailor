import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Endpoint, PackageMeta, ToolMeta } from "./reference";
import { ToolSchema } from "./tool-schema";

const DefaultLink = defaultMdxComponents.a;

/** Only docs pages go through the client router; product pages (/app, /home) are plain links. */
function DocsLink(props: ComponentProps<"a">) {
  const href = props.href ?? "";
  if (
    /^\/(zh\/)?docs(\/|$|#)/.test(href) &&
    !/\.(md|txt|json|xml)$/.test(href.split("#")[0] ?? "")
  ) {
    return DefaultLink ? <DefaultLink {...props} /> : <a {...props} />;
  }
  const external = /^https?:/.test(href);
  return <a {...props} rel={external ? "noopener" : props.rel} />;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    a: DocsLink,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Tab,
    Tabs,
    ToolMeta,
    ToolSchema,
    PackageMeta,
    Endpoint,
    ...components,
  };
}
