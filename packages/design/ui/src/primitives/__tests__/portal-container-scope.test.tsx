import { Popover as BasePopover } from "@base-ui/react/popover";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type PortalContainer, PortalContainerProvider } from "../../utils";
import { Combobox } from "../combobox";
import { Dialog, DialogContent, DialogPortal, DialogTrigger } from "../dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Popover, PopoverContent, PopoverPositioner, PopoverTrigger } from "../popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

const overlays = [
  {
    name: "popover",
    render: (container?: PortalContainer) => (
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent container={container} aria-label="Scoped popover">
          Popover details
        </PopoverContent>
      </Popover>
    ),
    open: () => fireEvent.click(screen.getByRole("button", { name: "Open popover" })),
    find: () => screen.findByRole("dialog", { name: "Scoped popover" }),
  },
  {
    name: "composed popover",
    render: (container?: PortalContainer) => (
      <Popover>
        <PopoverTrigger>Open composed popover</PopoverTrigger>
        <PopoverPositioner container={container}>
          <BasePopover.Popup aria-label="Composed popover" role="dialog">
            Details
          </BasePopover.Popup>
        </PopoverPositioner>
      </Popover>
    ),
    open: () => fireEvent.click(screen.getByRole("button", { name: "Open composed popover" })),
    find: () => screen.findByRole("dialog", { name: "Composed popover" }),
  },
  {
    name: "combobox",
    render: (container?: PortalContainer) => (
      <Combobox
        label="Language"
        container={container}
        options={[{ value: "ts", label: "TypeScript" }]}
      />
    ),
    open: () => fireEvent.click(screen.getByRole("combobox", { name: "Language" })),
    find: () => screen.findByRole("option", { name: "TypeScript" }),
  },
  {
    name: "tooltip",
    render: (container?: PortalContainer) => (
      <Tooltip>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent container={container}>Scoped help</TooltipContent>
      </Tooltip>
    ),
    open: () => fireEvent.focus(screen.getByRole("button", { name: "Help" })),
    find: () => screen.findByText("Scoped help"),
  },
  {
    name: "menu",
    render: (container?: PortalContainer) => (
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent container={container}>
          <DropdownMenuItem>Save changes</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    open: () => fireEvent.click(screen.getByRole("button", { name: "Actions" })),
    find: () => screen.findByRole("menuitem", { name: "Save changes" }),
  },
  {
    name: "select",
    render: (container?: PortalContainer) => (
      <Select>
        <SelectTrigger aria-label="Project">
          <SelectValue />
        </SelectTrigger>
        <SelectContent container={container}>
          <SelectItem value="alpha">Alpha</SelectItem>
        </SelectContent>
      </Select>
    ),
    open: () => fireEvent.click(screen.getByRole("combobox", { name: "Project" })),
    find: () => screen.findByRole("option", { name: "Alpha" }),
  },
  {
    name: "dialog",
    render: (container?: PortalContainer) => (
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent container={container} aria-label="Scoped dialog">
          Dialog details
        </DialogContent>
      </Dialog>
    ),
    open: () => fireEvent.click(screen.getByRole("button", { name: "Open dialog" })),
    find: () => screen.findByRole("dialog", { name: "Scoped dialog" }),
  },
];

const stages: HTMLElement[] = [];
function stage() {
  const element = document.createElement("div");
  document.body.append(element);
  stages.push(element);
  return element;
}

function fullscreen(element: HTMLElement | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => element,
  });
}

function Scope({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = React.useState<HTMLDivElement | null>(null);
  return (
    <div ref={setScope} className="dark" data-testid="scope">
      <PortalContainerProvider container={scope}>{children}</PortalContainerProvider>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fullscreenElement");
  for (const element of stages.splice(0)) element.remove();
});

HTMLElement.prototype.scrollIntoView = vi.fn();

describe.each(overlays)("$name portal placement", (overlay) => {
  async function popup() {
    if ("open" in overlay) overlay.open();
    return overlay.find();
  }

  it("inherits a reactive element scope and its theme ancestry", async () => {
    render(<Scope>{overlay.render()}</Scope>);
    const content = await popup();
    await waitFor(() => expect(screen.getByTestId("scope")).toContainElement(content));
    expect(content.closest(".dark")).toBe(screen.getByTestId("scope"));
  });

  it("keeps the default body placement without a provider", async () => {
    const result = render(overlay.render());
    const content = await popup();
    expect(document.body).toContainElement(content);
    expect(result.container).not.toContainElement(content);
  });

  it("uses the fullscreen element when no scoped target exists", async () => {
    const target = stage();
    fullscreen(target);
    render(
      <PortalContainerProvider container={null}>{overlay.render(null)}</PortalContainerProvider>,
    );
    expect(target).toContainElement(await popup());
  });

  it("prefers the provider over fullscreen and an explicit target over both", async () => {
    const fullscreenTarget = stage();
    const scoped = stage();
    const explicit = stage();
    fullscreen(fullscreenTarget);
    const result = render(
      <PortalContainerProvider container={scoped}>{overlay.render()}</PortalContainerProvider>,
    );
    expect(scoped).toContainElement(await popup());
    result.unmount();

    render(
      <PortalContainerProvider container={scoped}>
        {overlay.render(explicit)}
      </PortalContainerProvider>,
    );
    expect(explicit).toContainElement(await popup());
  });
});

describe("portal scope composition", () => {
  it("resolves a same-mount object ref for a default-open portal in StrictMode", async () => {
    function RefScope() {
      const hostRef = React.useRef<HTMLDivElement>(null);
      return (
        <div ref={hostRef} className="dark" data-testid="ref-scope">
          <PortalContainerProvider container={hostRef}>
            <Popover defaultOpen>
              <PopoverContent aria-label="Default open popover">Themed content</PopoverContent>
            </Popover>
          </PortalContainerProvider>
        </div>
      );
    }

    render(
      <React.StrictMode>
        <RefScope />
      </React.StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("ref-scope")).toContainElement(
        screen.getByRole("dialog", { name: "Default open popover" }),
      ),
    );
  });

  it("moves an already-mounted portal into a ref host that mounts later", async () => {
    const hostRef = React.createRef<HTMLDivElement>();

    function HostSwitcher() {
      const [mounted, setMounted] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setMounted(true)}>
            Mount scope
          </button>
          {mounted && <div ref={hostRef} data-testid="delayed-scope" />}
        </>
      );
    }

    render(
      <PortalContainerProvider container={hostRef}>
        <HostSwitcher />
        <Popover open>
          <PopoverContent aria-label="Delayed popover">Delayed content</PopoverContent>
        </Popover>
      </PortalContainerProvider>,
    );

    await screen.findByRole("dialog", { name: "Delayed popover" });
    fireEvent.click(screen.getByRole("button", { name: "Mount scope" }));

    await waitFor(() =>
      expect(screen.getByTestId("delayed-scope")).toContainElement(
        screen.getByRole("dialog", { name: "Delayed popover" }),
      ),
    );
  });

  it("moves an open portal when a ref host is replaced", async () => {
    const hostRef = React.createRef<HTMLDivElement>();

    function HostSwitcher() {
      const [version, setVersion] = React.useState(1);
      return (
        <>
          <button type="button" onClick={() => setVersion(2)}>
            Replace scope
          </button>
          <div key={version} ref={hostRef} data-testid={`scope-${version}`} />
        </>
      );
    }

    render(
      <PortalContainerProvider container={hostRef}>
        <HostSwitcher />
        <Popover open>
          <PopoverContent aria-label="Replaced popover">Replaced content</PopoverContent>
        </Popover>
      </PortalContainerProvider>,
    );

    const content = await screen.findByRole("dialog", { name: "Replaced popover" });
    const initialScope = screen.getByTestId("scope-1");
    expect(initialScope).toContainElement(content);

    fireEvent.click(screen.getByRole("button", { name: "Replace scope" }));

    await waitFor(() =>
      expect(screen.getByTestId("scope-2")).toContainElement(
        screen.getByRole("dialog", { name: "Replaced popover" }),
      ),
    );
    expect(within(initialScope).queryByRole("dialog")).toBeNull();
    expect(initialScope.isConnected).toBe(false);
  });

  it("rechecks a stable ref reassigned to an existing host on a provider commit", async () => {
    const first = stage();
    const second = stage();
    const hostRef = { current: first };
    const content = (
      <Popover open>
        <PopoverContent aria-label="Reassigned popover">Reassigned content</PopoverContent>
      </Popover>
    );
    const result = render(
      <PortalContainerProvider container={hostRef}>{content}</PortalContainerProvider>,
    );
    expect(first).toContainElement(
      await screen.findByRole("dialog", { name: "Reassigned popover" }),
    );

    hostRef.current = second;
    result.rerender(
      <PortalContainerProvider container={hostRef}>{content}</PortalContainerProvider>,
    );

    await waitFor(() =>
      expect(second).toContainElement(screen.getByRole("dialog", { name: "Reassigned popover" })),
    );
    expect(first.querySelector('[role="dialog"]')).toBeNull();
  });

  it("falls back to fullscreen when a ref host is removed", async () => {
    const hostRef = React.createRef<HTMLDivElement>();
    const fullscreenTarget = stage();
    fullscreen(fullscreenTarget);

    function HostSwitcher() {
      const [mounted, setMounted] = React.useState(true);
      return (
        <>
          <button type="button" onClick={() => setMounted(false)}>
            Remove scope
          </button>
          {mounted && <div ref={hostRef} data-testid="removable-scope" />}
        </>
      );
    }

    render(
      <PortalContainerProvider container={hostRef}>
        <HostSwitcher />
        <Popover open>
          <PopoverContent aria-label="Fullscreen fallback">Fallback content</PopoverContent>
        </Popover>
      </PortalContainerProvider>,
    );
    expect(screen.getByTestId("removable-scope")).toContainElement(
      await screen.findByRole("dialog", { name: "Fullscreen fallback" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove scope" }));

    await waitFor(() =>
      expect(fullscreenTarget).toContainElement(
        screen.getByRole("dialog", { name: "Fullscreen fallback" }),
      ),
    );
    expect(screen.queryByTestId("removable-scope")).not.toBeInTheDocument();
  });

  it("supports ShadowRoot targets", async () => {
    const shadow = stage().attachShadow({ mode: "open" });
    render(
      <PortalContainerProvider container={shadow}>{overlays[0].render()}</PortalContainerProvider>,
    );
    overlays[0].open?.();
    expect(await within(shadow as unknown as HTMLElement).findByRole("dialog")).toHaveTextContent(
      "Popover details",
    );
  });

  it("uses the nearest provider and lets a null scope return to default placement", async () => {
    const outer = stage();
    const inner = stage();
    const result = render(
      <PortalContainerProvider container={outer}>
        <PortalContainerProvider container={inner}>{overlays[0].render()}</PortalContainerProvider>
      </PortalContainerProvider>,
    );
    overlays[0].open?.();
    expect(inner).toContainElement(await overlays[0].find());
    result.unmount();
    render(
      <PortalContainerProvider container={outer}>
        <PortalContainerProvider container={null}>{overlays[0].render()}</PortalContainerProvider>
      </PortalContainerProvider>,
    );
    overlays[0].open?.();
    const popup = await overlays[0].find();
    await waitFor(() => {
      expect(document.body).toContainElement(popup);
      expect(inner).not.toContainElement(popup);
      expect(outer).not.toContainElement(popup);
    });
  });

  it("keeps submenu content in scope and honors its explicit target", async () => {
    const scoped = stage();
    const explicit = stage();
    function Menu({ container }: { container?: PortalContainer }) {
      return (
        <PortalContainerProvider container={scoped}>
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuSub defaultOpen>
                <DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger>
                <DropdownMenuSubContent container={container}>
                  <DropdownMenuItem>Export CSV</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </PortalContainerProvider>
      );
    }
    const result = render(<Menu />);
    expect(scoped).toContainElement(await screen.findByRole("menuitem", { name: "Export CSV" }));
    result.rerender(<Menu container={explicit} />);
    await waitFor(() =>
      expect(explicit).toContainElement(screen.getByRole("menuitem", { name: "Export CSV" })),
    );
  });

  it("preserves DialogPortal props and ref while applying the scope", async () => {
    const target = stage();
    const ref = React.createRef<HTMLDivElement>();
    render(
      <PortalContainerProvider container={target}>
        <Dialog defaultOpen>
          <DialogPortal ref={ref} data-testid="custom-portal">
            <span>Custom dialog surface</span>
          </DialogPortal>
        </Dialog>
      </PortalContainerProvider>,
    );
    expect(target).toContainElement(await screen.findByTestId("custom-portal"));
    expect(ref.current).toBe(screen.getByTestId("custom-portal"));
  });
});
