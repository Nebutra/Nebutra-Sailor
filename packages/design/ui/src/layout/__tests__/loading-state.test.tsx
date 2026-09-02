// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "../LoadingState";

describe("LoadingState", () => {
  it("spans the content pane so the spinner and copy stay centered", () => {
    const { container } = render(<LoadingState message="Fetching deployments…" />);

    expect(container.firstElementChild).toHaveClass("w-full");
    expect(container.firstElementChild).toHaveClass("items-center");
    expect(screen.getByRole("status", { name: "Fetching deployments…" })).toBeInTheDocument();
    expect(screen.getByText("Fetching deployments…")).toBeInTheDocument();
  });
});
