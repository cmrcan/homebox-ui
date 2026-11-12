import { describe, it, expect, vi } from "vitest";
import { parseScan, resolveScan } from "../webapp/service/barcodes";
import { HomeboxApi, ApiError } from "../webapp/service/HomeboxApi";
const id = "11111111-2222-4333-8444-555555555555";
function apiWith(
  handler: (url: URL) => unknown,
  mode: "entities" | "legacy" = "entities",
) {
  const transport = vi.fn(
    async (input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify(handler(new URL(String(input), "http://local"))),
        { status: 200 },
      ),
  );
  const api = new HomeboxApi(mode, transport);
  api.session = {
    token: "Bearer test",
    attachmentToken: "",
    expiresAt: "2099",
  };
  api.tenant = "g";
  return { api, transport };
}
describe("barcode parsing", () => {
  it("reads Homebox UUID/hash links and normalized asset labels without following external links", () => {
    expect(parseScan(`https://old-homebox.local/#/item/${id}`)).toMatchObject({
      id,
    });
    expect(parseScan(`/locations/${id}`)).toMatchObject({
      id,
      kind: "location",
    });
    expect(parseScan("https://old-homebox.local/a/001-003-555")).toEqual({
      query: "#001003555",
      assetId: "001003555",
    });
    expect(parseScan("000000001")).toMatchObject({ assetId: "000000001" });
    expect(parseScan("javascript:alert(1)")).toEqual({
      query: "javascript:alert(1)",
    });
  });
  it("preserves EAN strings and rejects empty, oversized and control-character input", () => {
    expect(parseScan(" 8691234567890 ")).toEqual({ query: "8691234567890" });
    for (const value of [" ", "a".repeat(2049), "abc\nxyz"])
      expect(() => parseScan(value)).toThrow();
  });
});
describe("Homebox scan lookup", () => {
  it("opens a location UUID with auth/tenant headers and no list traversal", async () => {
    const { api, transport } = apiWith(() => ({
      id,
      name: "Salon",
      entityType: { isLocation: true },
    }));
    expect((await resolveScan(api, id)).matches[0]).toMatchObject({
      id,
      kind: "location",
    });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(
      new Headers((transport.mock.calls[0] as any)[1].headers).get("X-Tenant"),
    ).toBe("g");
  });
  it("uses the supported #asset query and includes archived locations", async () => {
    const { api, transport } = apiWith((url) => ({
      items:
        url.searchParams.get("isLocation") === "true"
          ? [{ id, name: "Salon", assetId: "001-003-555" }]
          : [],
    }));
    const result = await resolveScan(api, "/a/001-003-555");
    expect(result.matches).toEqual([
      { id, name: "Salon", kind: "location", location: "" },
    ]);
    for (const call of transport.mock.calls) {
      const url = new URL(String(call[0]), "http://local");
      expect(url.searchParams.get("q")).toBe("#001003555");
      expect(url.searchParams.get("includeArchived")).toBe("true");
    }
  });
  it("combines exact serial and barcode fields, de-duplicates results and keeps multiple matches", async () => {
    const { api } = apiWith((url) => ({
      items:
        url.searchParams.get("isLocation") === "true"
          ? []
          : url.searchParams.has("fields")
            ? [
                { id: "a", name: "Cihaz" },
                { id: "b", name: "Başka cihaz" },
              ]
            : [
                { id: "a", name: "Cihaz", serialNumber: "SERIAL" },
                { id: "partial", name: "SERIAL yazılı isim" },
              ],
    }));
    expect((await resolveScan(api, "SERIAL")).matches.map((x) => x.id)).toEqual(
      ["a", "b"],
    );
  });
  it("does not turn failed authorization into an empty result", async () => {
    const api = new HomeboxApi(
      "entities",
      async () => new Response("{}", { status: 401 }),
    );
    await expect(resolveScan(api, id)).rejects.toBeInstanceOf(ApiError);
  });
  it("uses the legacy location resource for a location URL", async () => {
    const { api, transport } = apiWith(
      () => ({ id, name: "Eski oda" }),
      "legacy",
    );
    expect((await resolveScan(api, `/location/${id}`)).matches[0].kind).toBe(
      "location",
    );
    expect(String(transport.mock.calls[0][0])).toBe(`/api/v1/locations/${id}`);
  });
});
