import {
  ApiError,
  type HomeboxApi,
  type Item,
  type Organizer,
} from "./HomeboxApi";
export interface ScanCode {
  query: string;
  id?: string;
  kind?: "item" | "location";
  assetId?: string;
}
export interface ScanMatch {
  id: string;
  name: string;
  kind: "item" | "location";
  location: string;
}
export interface ScanResolution {
  query: string;
  matches: ScanMatch[];
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asset = /^#?\d(?:[\d-]*\d)?$/;
/** Treat scanned links as data. Never open external URLs or execute scanned content. */
export function parseScan(input: string): ScanCode {
  const value = input.trim();
  if (!value || value.length > 2048 || /[\u0000-\u001f]/.test(value))
    throw new Error("Geçerli bir barkod veya QR kod girin.");
  if (uuid.test(value)) return { query: value, id: value };
  let path = value;
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      path = url.hash ? url.hash.slice(1) : url.pathname;
    }
    path = decodeURIComponent(path)
      .replace(/^\/?#?\/?/, "")
      .split(/[?]/)[0];
  } catch {
    return { query: value };
  }
  const parts = path.split("/").filter(Boolean);
  if (
    parts.length === 2 &&
    [
      "item",
      "inventory",
      "entity",
      "entities",
      "location",
      "locations",
    ].includes(parts[0]) &&
    uuid.test(parts[1])
  ) {
    return {
      query: parts[1],
      id: parts[1],
      kind: parts[0].startsWith("location") ? "location" : undefined,
    };
  }
  if (
    parts.length === 2 &&
    ["a", "assets", "asset"].includes(parts[0]) &&
    asset.test(parts[1])
  ) {
    const id = parts[1].replace(/[#-]/g, "");
    return { query: `#${id}`, assetId: id };
  }
  if (asset.test(value) && value.replace(/[#-]/g, "").length <= 12) {
    const id = value.replace(/[#-]/g, "");
    return { query: value, assetId: id };
  }
  return { query: value };
}
function match(
  item: Organizer & { location?: Organizer | null },
  kind?: ScanMatch["kind"],
): ScanMatch {
  return {
    id: item.id,
    name: item.name,
    kind: kind || (item.entityType?.isLocation ? "location" : "item"),
    location: item.parent?.name || item.location?.name || "",
  };
}
export async function resolveScan(
  api: HomeboxApi,
  input: string,
): Promise<ScanResolution> {
  const code = parseScan(input);
  const common = { page: 1, pageSize: 100, includeArchived: true };
  if (code.id) {
    try {
      const item =
        api.mode === "legacy" && code.kind === "location"
          ? await api.organizer("locations", code.id)
          : await api.item(code.id);
      return {
        query: code.query,
        matches: [match(item, api.mode === "legacy" ? code.kind : undefined)],
      };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
    return { query: code.query, matches: [] };
  }
  const kinds = api.mode === "entities" ? [false, true] : [false];
  if (code.assetId) {
    const pages = await Promise.all(
      kinds.map((isLocation) =>
        api.list({
          ...common,
          q: `#${code.assetId}`,
          ...(api.mode === "entities" ? { isLocation } : {}),
        }),
      ),
    );
    const matches = pages.flatMap((page, i) =>
      page.items
        .filter(
          (item) =>
            !!String(item.assetId || "") &&
            (String(item.assetId || "").replace(/-/g, "") === code.assetId ||
              String(Number(String(item.assetId || ""))) ===
                String(Number(code.assetId))),
        )
        .map((item) => match(item, kinds[i] ? "location" : "item")),
    );
    if (matches.length) return { query: code.query, matches };
  }
  const params = kinds.map((isLocation) => ({
    ...common,
    q: code.query,
    ...(api.mode === "entities" ? { isLocation } : {}),
  }));
  const pages = await Promise.all(params.map((p) => api.list(p)));
  const matches = pages.flatMap((p, i) =>
    p.items
      .filter(
        (item) =>
          String(item.serialNumber || "")
            .trim()
            .toLocaleLowerCase() === code.query.toLocaleLowerCase(),
      )
      .map((item) => match(item, kinds[i] ? "location" : "item")),
  );
  if (api.mode === "entities") {
    const fields = [
      "Barkod",
      "barkod",
      "Barcode",
      "barcode",
      "EAN",
      "ean",
      "EAN-13",
      "UPC",
      "upc",
      "GTIN",
      "gtin",
    ].map((name) => `${name}=${code.query}`);
    const fieldPages = await Promise.all(
      kinds.map((isLocation) => api.list({ ...common, fields, isLocation })),
    );
    fieldPages.forEach((p, i) =>
      p.items.forEach((item) =>
        matches.push(match(item, kinds[i] ? "location" : "item")),
      ),
    );
  }
  return {
    query: code.query,
    matches: [...new Map(matches.map((item) => [item.id, item])).values()],
  };
}
