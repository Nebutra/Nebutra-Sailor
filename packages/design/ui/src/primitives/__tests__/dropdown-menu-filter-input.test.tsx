import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuFilterInput,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

/**
 * Regression cover for the reason `DropdownMenuFilterInput` exists.
 *
 * Base UI's menu wires `useTypeahead` on the popup and calls
 * `preventDefault()` + `stopPropagation()` for every printable character key, so
 * a bare `<input>` inside menu content cannot be typed into. The filter input
 * stops the keydown before the popup sees it, while leaving ArrowUp/ArrowDown
 * and Enter to the menu so the keyboard path into the items survives.
 */

function Harness({ raw }: { raw: boolean }) {
  const [value, setValue] = useState("");
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger aria-label="Open">trigger</DropdownMenuTrigger>
      <DropdownMenuContent>
        {raw ? (
          <input
            aria-label="filter"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : (
          <DropdownMenuFilterInput
            aria-label="filter"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
        <DropdownMenuItem>Deutsch</DropdownMenuItem>
        <DropdownMenuItem>English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenuFilterInput", () => {
  it("keeps printable character keys inside the field instead of the menu typeahead", () => {
    render(<Harness raw={false} />);
    const input = screen.getByLabelText("filter");
    const event = new KeyboardEvent("keydown", {
      key: "e",
      bubbles: true,
      cancelable: true,
    });
    fireEvent(input, event);
    // Base UI's typeahead calls preventDefault() on character keys. If the menu
    // had seen this keystroke the field could never receive the character.
    expect(event.defaultPrevented).toBe(false);
  });

  it("lets ArrowDown reach the menu so focus can leave the field for the items", () => {
    render(<Harness raw={false} />);
    const input = screen.getByLabelText("filter");
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("documents the bug it replaces: a raw input in menu content loses characters", () => {
    render(<Harness raw />);
    const input = screen.getByLabelText("filter");
    const event = new KeyboardEvent("keydown", {
      key: "e",
      bubbles: true,
      cancelable: true,
    });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(true);
  });
});
