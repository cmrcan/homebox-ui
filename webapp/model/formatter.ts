import type { CustomField, Item } from "../service/HomeboxApi";
import { fieldDisplay } from "./fields";
export const money = (value: unknown, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
export const date = (value: unknown) =>
  typeof value === "string" && value && !value.startsWith("0001")
    ? new Date(value).toLocaleDateString("tr-TR")
    : "—";
export const dateOnly = (value: unknown) =>
  typeof value === "string" && !value.startsWith("0001")
    ? value.slice(0, 10)
    : "";
export default {
  money,
  compactNumber: (value: unknown) =>
    new Intl.NumberFormat("tr-TR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value) || 0),
  date,
  initials: (name: string) =>
    (name || "")
      .trim()
      .split(/\s+/)
      .map((v) => v[0])
      .slice(0, 2)
      .join("")
      .toLocaleUpperCase("tr"),
  fieldValue: (
    type: CustomField["type"],
    textValue: string,
    numberValue: number,
    booleanValue: boolean,
    timeValue: string,
  ) =>
    fieldDisplay({
      name: "",
      type,
      textValue,
      numberValue,
      booleanValue,
      timeValue,
    }),
  location: (
    parent?: { name: string } | null,
    location?: { name: string } | null,
  ) => parent?.name || location?.name || "Konumsuz",
  page: (page: number, total: number) =>
    `${total || 0} ürün · Sayfa ${page} / ${Math.max(1, Math.ceil((total || 0) / 12))}`,
  next: (page: number, total: number) => page * 12 < total,
  field: fieldDisplay,
  tags: (value: Item["tags"]) =>
    (value || []).map((t) => t.name).join(", ") || "—",
  done: (value: string) => !!value && !value.startsWith("0001"),
  fields: (value: CustomField[]) => value || [],
};
