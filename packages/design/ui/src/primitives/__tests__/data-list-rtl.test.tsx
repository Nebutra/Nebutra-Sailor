import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataList, type DataListColumn } from "../data-list";

type Row = { id: string; name: string };

const ROWS: Row[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
];

function columns(onInner: () => void): DataListColumn<Row>[] {
  return [
    { id: "name", header: "Name", cell: (row) => row.name },
    {
      id: "action",
      header: "Action",
      align: "end",
      cell: (row) => (
        <button type="button" onClick={onInner}>
          Open {row.name}
        </button>
      ),
    },
  ];
}

function renderList(onRowClick: (row: Row) => void, onInner: () => void = () => {}) {
  return render(
    <div dir="rtl">
      <DataList<Row>
        columns={columns(onInner)}
        getRowKey={(row) => row.id}
        label="Items"
        onRowClick={onRowClick}
        rows={ROWS}
      />
    </div>,
  );
}

function firstBodyRow() {
  const row = screen.getAllByRole("row")[1];
  if (!row) throw new Error("expected a body row");
  return row;
}

describe("DataList in RTL", () => {
  it("aligns header and cells with logical classes only", () => {
    const { container } = renderList(() => {});
    const html = container.innerHTML;
    expect(html).not.toMatch(/(^|[\s"])text-(left|right)(\s|")/);
    expect(html).not.toMatch(/rounded-[lr](-|\s|")/);
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]?.className).toContain("first:rounded-s-");
    expect(headers[1]?.className).toContain("last:rounded-e-");
  });
});

describe("DataList clickable rows", () => {
  it("activates once on Enter and Space on the row itself", () => {
    const onRowClick = vi.fn();
    renderList(onRowClick);
    const row = firstBodyRow();
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("does not activate the row when a nested button is pressed with the keyboard", () => {
    const onRowClick = vi.fn();
    renderList(onRowClick);
    const inner = screen.getByRole("button", { name: "Open Alpha" });
    fireEvent.keyDown(inner, { key: "Enter" });
    fireEvent.keyDown(inner, { key: " " });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not activate the row when a nested button is clicked", () => {
    const onRowClick = vi.fn();
    const onInner = vi.fn();
    renderList(onRowClick, onInner);
    fireEvent.click(screen.getByRole("button", { name: "Open Alpha" }));
    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("still activates when a non-interactive cell is clicked", () => {
    const onRowClick = vi.fn();
    renderList(onRowClick);
    fireEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("keeps native row semantics and makes the row focusable", () => {
    renderList(() => {});
    const row = firstBodyRow();
    expect(row.tagName).toBe("TR");
    expect(row.getAttribute("role")).toBeNull();
    expect(row.tabIndex).toBe(0);
  });
});
