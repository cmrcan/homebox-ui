import { describe, it, expect } from "vitest";
import {
  cleanFields,
  copyFields,
  fieldDisplay,
  mergeTemplateFields,
} from "../src/fields";

describe("custom fields", () => {
  it("drops unnamed rows and keeps only the value for the field type", () => {
    const cleaned = cleanFields([
      { id: "a", name: "  Voltaj ", type: "number", numberValue: 24, textValue: "x" },
      { name: "", type: "text", textValue: "boş" },
      { name: "Garantili", type: "boolean", booleanValue: true },
      { name: "Bakım", type: "time", timeValue: "" },
    ]);
    expect(cleaned).toEqual([
      { id: "a", name: "Voltaj", type: "number", numberValue: 24 },
      { name: "Garantili", type: "boolean", booleanValue: true },
      { name: "Bakım", type: "time", timeValue: "0001-01-01" },
    ]);
  });
  it("merges template fields by name without ids or duplicates", () => {
    const merged = mergeTemplateFields(
      [{ name: "Voltaj", type: "number", numberValue: 5 }],
      [
        { id: "t1", name: "voltaj", type: "number", numberValue: 24 },
        { id: "t2", name: "Renk", type: "text", textValue: "Gri" },
      ],
    );
    expect(merged).toEqual([
      { name: "Voltaj", type: "number", numberValue: 5 },
      { name: "Renk", type: "text", textValue: "Gri" },
    ]);
  });
  it("formats values and copies deeply", () => {
    expect(fieldDisplay({ name: "a", type: "boolean", booleanValue: false })).toBe("Hayır");
    expect(fieldDisplay({ name: "a", type: "time", timeValue: "0001-01-01" })).toBe("—");
    const source = [{ name: "a", type: "text" as const }];
    expect(copyFields(source)[0]).not.toBe(source[0]);
    expect(copyFields(undefined)).toEqual([]);
  });
});
