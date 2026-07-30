import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton, CopyMenuItem } from "../copy-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../dropdown-menu";

/**
 * Seven files hand-rolled their own copy button while this one had zero
 * importers. Adopting it is only an improvement if the contract it replaces
 * survives, so these tests pin the three things the hand-rolled versions each
 * got partly right and no single one got fully right:
 *
 *  1. an accessible name, exactly one of them,
 *  2. a copied state that is actually perceivable — including to a screen
 *     reader, which none of the seven addressed,
 *  3. for the menu-shaped call sites, the menu's own keyboard contract
 *     (arrow navigation, typeahead) which a raw `<button>` in menu content
 *     forfeits entirely.
 */

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn(() => Promise.resolve());

function installClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
}

/**
 * `userEvent.setup()` installs its own `navigator.clipboard` stub, so the spy has
 * to go on afterwards or every assertion about *what* was copied silently reads
 * an untouched mock.
 */
function setupUser() {
  const user = userEvent.setup();
  installClipboard();
  return user;
}

beforeEach(() => {
  writeText.mockClear();
  installClipboard();
});

describe("CopyButton — accessible name", () => {
  it("names an icon-only button from tooltipText", () => {
    render(<CopyButton value="v" tooltipText="Copy code" />);
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("does not emit a second name when a visible label is present", () => {
    // The pre-adoption version rendered the visible label *and* an sr-only
    // tooltipText, so the name came out as "Copy Copy".
    render(<CopyButton value="v" label="Copy" tooltipText="Copy" />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("lets a caller override the name to say what is being copied", () => {
    render(<CopyButton value="NEB-1" label="Copy" aria-label="Copy referral code" />);
    expect(screen.getByRole("button", { name: "Copy referral code" })).toBeInTheDocument();
  });
});

describe("CopyButton — copied state", () => {
  it("writes the value and swaps the visible label to copiedLabel", async () => {
    const user = setupUser();
    render(<CopyButton value="payload" label="Copy" copiedLabel="Copied" showToast={false} />);

    await user.click(screen.getByRole("button"));

    expect(writeText).toHaveBeenCalledWith("payload");
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Copied"));
  });

  it("keeps the label when copiedLabel is false — the label is the payload", async () => {
    const user = setupUser();
    render(
      <CopyButton
        value="var(--gradient-brand)"
        label="var(--gradient-brand)"
        copiedLabel={false}
        showToast={false}
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByRole("button")).toHaveTextContent("var(--gradient-brand)");
  });

  it("announces the success message in a polite live region", async () => {
    const user = setupUser();
    const { container } = render(
      <CopyButton value="v" successMessage="Link copied" showToast={false} />,
    );
    const live = container.querySelector('[aria-live="polite"]');

    // Empty while idle, so it never leaks into the button's accessible name.
    expect(live).toBeInTheDocument();
    expect(live).toHaveTextContent("");

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(live).toHaveTextContent("Link copied"));
  });

  it("keeps the copied tint when the caller passes its own text colour", async () => {
    const user = setupUser();
    // Two of the migrated call sites pass a `text-*` class. Tinting the Button
    // would let that class win the class merge and silently delete the check's
    // colour, so the tint belongs on the icon.
    const { container } = render(
      <CopyButton value="v" label="Copy" showToast={false} className="text-neutral-11" />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(
        container.querySelector(".text-\\[hsl\\(var\\(--success-strong\\)\\)\\]"),
      ).not.toBeNull(),
    );
  });
});

describe("CopyMenuItem — the menu keyboard contract a raw button forfeits", () => {
  function Harness({ closeOnCopy = false }: { closeOnCopy?: boolean }) {
    return (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger aria-label="Open">trigger</DropdownMenuTrigger>
        <DropdownMenuContent>
          <CopyMenuItem value="#f8fafc" closeOnCopy={closeOnCopy}>
            Copy HEX
          </CopyMenuItem>
          <CopyMenuItem value="bg-neutral-2" closeOnCopy={closeOnCopy}>
            Copy Tailwind Class
          </CopyMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("renders as menu items, so the menu can own them", () => {
    render(<Harness />);
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("is reachable and activatable by keyboard alone", async () => {
    const user = setupUser();
    render(<Harness />);

    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /Copy HEX/ })).toHaveAttribute(
        "data-highlighted",
      ),
    );

    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /Copy Tailwind Class/ })).toHaveAttribute(
        "data-highlighted",
      ),
    );

    await user.keyboard("{Enter}");
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("bg-neutral-2"));
  });

  it("stays open on copy so its own confirmation is visible", async () => {
    const user = setupUser();
    render(<Harness />);

    await user.click(screen.getByRole("menuitem", { name: /Copy HEX/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("#f8fafc"));
    expect(screen.getByRole("menuitem", { name: /Copy Tailwind Class/ })).toBeInTheDocument();
  });

  it("closes on copy when the call site asks it to", async () => {
    const user = setupUser();
    render(<Harness closeOnCopy />);

    await user.click(screen.getByRole("menuitem", { name: /Copy HEX/ }));

    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });

  it("announces the success message to a screen reader", async () => {
    const user = setupUser();
    render(<Harness />);

    await user.click(screen.getByRole("menuitem", { name: /Copy HEX/ }));

    await waitFor(() => {
      const live = document.querySelector('[aria-live="polite"]');
      expect(live).toHaveTextContent("Copied to clipboard");
    });
  });
});
