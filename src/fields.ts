import type { CustomField, FieldType } from "./api";

export const fieldTypes: Array<{ id: FieldType; name: string }> = [
  { id: "text", name: "Metin" },
  { id: "number", name: "Sayı" },
  { id: "boolean", name: "Evet / hayır" },
  { id: "time", name: "Tarih" },
];

export function blankField(type: FieldType = "text"): CustomField {
  return { name: "", type, textValue: "" };
}

/** Human-readable value for the detail view. */
export function fieldDisplay(field: CustomField): string {
  switch (field.type) {
    case "number":
      return String(field.numberValue ?? 0);
    case "boolean":
      return field.booleanValue ? "Evet" : "Hayır";
    case "time": {
      const value = field.timeValue || "";
      return value && !value.startsWith("0001") ? value.slice(0, 10) : "—";
    }
    default:
      return field.textValue || "—";
  }
}

/** Trim names, drop unnamed rows, keep only the value that matches the type. */
export function cleanFields(fields: CustomField[]): CustomField[] {
  return fields
    .map((field) => ({ ...field, name: field.name.trim() }))
    .filter((field) => field.name)
    .map((field) => {
      const base: CustomField = {
        ...(field.id ? { id: field.id } : {}),
        name: field.name,
        type: field.type,
      };
      if (field.type === "number")
        return { ...base, numberValue: Number(field.numberValue) || 0 };
      if (field.type === "boolean")
        return { ...base, booleanValue: !!field.booleanValue };
      if (field.type === "time")
        return { ...base, timeValue: field.timeValue || "0001-01-01" };
      return { ...base, textValue: field.textValue ?? "" };
    });
}

/** Add template fields that the item does not have yet (matched by name). */
export function mergeTemplateFields(
  current: CustomField[],
  templateFields: CustomField[] = [],
): CustomField[] {
  const known = new Set(
    current.map((f) => f.name.trim().toLocaleLowerCase("tr")),
  );
  const added = templateFields
    .filter((f) => f.name && !known.has(f.name.trim().toLocaleLowerCase("tr")))
    .map((f) => {
      // A template field keeps its default value but never its id.
      const { id: _id, ...rest } = f;
      return { ...rest, type: f.type || "text" } as CustomField;
    });
  return [...current, ...added];
}

export function copyFields(fields: unknown): CustomField[] {
  return Array.isArray(fields)
    ? (JSON.parse(JSON.stringify(fields)) as CustomField[])
    : [];
}
