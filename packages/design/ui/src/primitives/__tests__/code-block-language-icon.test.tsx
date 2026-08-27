import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "../code-block";

describe("CodeBlock language icons", () => {
  it("renders a language logo marker for the active code language", () => {
    const { container } = render(
      <CodeBlock filename="example.py" language="python">
        {"print('hello')"}
      </CodeBlock>,
    );

    expect(container.querySelector("[data-code-block-language-icon]")).toHaveAttribute(
      "data-language",
      "python",
    );
  });

  it("allows consumers to override a language logo", () => {
    function CustomPythonIcon() {
      return <svg data-testid="custom-python-icon" />;
    }

    render(
      <CodeBlock
        filename="example.py"
        language="python"
        languageIcons={{ python: CustomPythonIcon }}
      >
        {"print('hello')"}
      </CodeBlock>,
    );

    expect(screen.getByTestId("custom-python-icon")).toBeInTheDocument();
  });

  it("keeps rendered code surfaces on the token mono stack", () => {
    const { container } = render(
      <CodeBlock filename="example.py" language="python">
        {"print('hello')"}
      </CodeBlock>,
    );

    expect(container.querySelector("pre")?.getAttribute("style")).toContain("var(--font-mono)");
  });
});
