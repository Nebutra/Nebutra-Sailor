import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { optionsFromChildren } from "./runner-select-options";

describe("optionsFromChildren", () => {
  it("maps option elements to value/label pairs", () => {
    const children = [
      createElement("option", { key: "a", value: "json-to-csv" }, "JSON → CSV"),
      createElement("option", { key: "b", value: "csv-to-json" }, "CSV → JSON"),
    ];
    expect(optionsFromChildren(children)).toEqual([
      { value: "json-to-csv", label: "JSON → CSV" },
      { value: "csv-to-json", label: "CSV → JSON" },
    ]);
  });

  it("marks disabled options", () => {
    const child = createElement("option", { value: "x", disabled: true }, "Off");
    expect(optionsFromChildren(child)).toEqual([{ value: "x", label: "Off", disabled: true }]);
  });

  it("ignores non-option children", () => {
    const children = [
      createElement("div", { key: "d" }, "nope"),
      createElement("option", { key: "o", value: "1" }, "One"),
    ];
    expect(optionsFromChildren(children)).toEqual([{ value: "1", label: "One" }]);
  });
});
