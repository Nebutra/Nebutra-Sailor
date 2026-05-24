import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Children, type ComponentProps, type ReactElement } from "react";

const codeBlockFrameClassName =
  "not-prose my-6 max-w-full min-w-0 overflow-hidden [&_figure]:m-0 [&_figure]:max-w-full [&_figure]:min-w-0 [&_figure]:overflow-hidden [&_pre]:max-w-full [&_pre]:min-w-0 [&_pre]:overflow-x-auto";

export function MdxCodeBlock(props: ComponentProps<"pre">) {
  const code = Children.only(props.children) as ReactElement<ComponentProps<"code">>;
  const codeProps = code.props;
  const content = codeProps.children;

  if (typeof content !== "string") {
    return (
      <pre {...props} className={codeBlockFrameClassName}>
        {props.children}
      </pre>
    );
  }

  let lang =
    codeProps.className
      ?.split(" ")
      .find((value) => value.startsWith("language-"))
      ?.slice("language-".length) ?? "text";

  if (lang === "mdx") lang = "md";

  return (
    <div className={codeBlockFrameClassName}>
      <DynamicCodeBlock lang={lang} code={content.trimEnd()} />
    </div>
  );
}
