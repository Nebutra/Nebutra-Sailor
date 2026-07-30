import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table } from "../table";

/**
 * The two contracts app code depends on when a table lives inside a panel that
 * already owns the border: `bare` must not draw a second frame, and `alignment`
 * must beat the implicit last-column right alignment (a plain `text-left` class
 * cannot, because `:last-child` outranks it).
 */
describe("Table chrome", () => {
  function wrapperOf(container: HTMLElement) {
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    return table?.parentElement as HTMLElement;
  }

  it("draws its own card chrome by default", () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>iad1</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const wrapper = wrapperOf(container);
    expect(wrapper.className).toContain("border");
    expect(wrapper.className).toContain("bg-card");
    expect(wrapper.className).toContain("p-[var(--table-padding)]");
    expect(wrapper.style.getPropertyValue("--table-body-spacer")).not.toBe("0px");
  });

  it("drops surface, border, padding and the body spacer when bare", () => {
    const { container } = render(
      <Table bare>
        <Table.Body>
          <Table.Row>
            <Table.Cell>iad1</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const wrapper = wrapperOf(container);
    expect(wrapper.className).not.toContain("bg-card");
    expect(wrapper.className).not.toContain("p-[var(--table-padding)]");
    expect(wrapper.className).not.toContain("rounded-[var(--table-radius)]");
    expect(wrapper.className).not.toContain("min-w-[var(--table-min-width)]");
    // Horizontal scroll is the one wrapper behaviour bare must keep.
    expect(wrapper.className).toContain("overflow-auto");
    expect(wrapper.style.getPropertyValue("--table-body-spacer")).toBe("0px");
  });

  it("lets a caller retune cell density through the exposed CSS variables", () => {
    const { container } = render(
      <Table bare wrapperStyle={{ "--table-cell-padding-x": "1rem" }}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>iad1</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    expect(wrapperOf(container).style.getPropertyValue("--table-cell-padding-x")).toBe("1rem");
  });

  it("right-aligns the last column unless a cell sets alignment", () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>Rule</Table.Head>
            <Table.Head>Action</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>read</Table.Cell>
            <Table.Cell>allow</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const cells = container.querySelectorAll("td");
    expect(cells[1]?.className).toContain("last:text-right");
  });

  it("suppresses the implicit last-column rule when alignment is set", () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head alignment="start">Notes</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell alignment="center" colSpan={1}>
              centred
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );

    const head = container.querySelector("th") as HTMLElement;
    expect(head.className).not.toContain("last:text-right");
    expect(head.className).toContain("text-left");

    const cell = container.querySelector("td") as HTMLElement;
    expect(cell.className).not.toContain("last:text-right");
    expect(cell.className).toContain("text-center");
  });
});
