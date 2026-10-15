import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

/**
 * In fullscreen the browser paints only the fullscreen element's subtree, so a
 * menu portalled to <body> opens invisibly (KCQ #299: the host workspace menu
 * in a fullscreen chart). Content must portal into the fullscreen element.
 */
function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => element,
  });
}

function Menu() {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger aria-label="Open">trigger</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Workspace A</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const stages: HTMLElement[] = [];

function createStage() {
  const stage = document.createElement("div");
  document.body.appendChild(stage);
  stages.push(stage);
  return stage;
}

describe("DropdownMenuContent portal target", () => {
  afterEach(() => {
    cleanup();
    setFullscreenElement(null);
    for (const stage of stages.splice(0)) stage.remove();
  });

  it("portals into the fullscreen element while fullscreen is active", async () => {
    const stage = createStage();
    setFullscreenElement(stage);

    render(<Menu />);

    const item = await screen.findByText("Workspace A");
    expect(stage.contains(item)).toBe(true);
  });

  it("portals into <body> outside fullscreen", async () => {
    const stage = createStage();

    render(<Menu />);

    const item = await screen.findByText("Workspace A");
    expect(stage.contains(item)).toBe(false);
    expect(document.body.contains(item)).toBe(true);
  });
});
