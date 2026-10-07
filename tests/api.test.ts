import { describe, it, expect, vi } from "vitest";
import {
  ApiError,
  HomeboxApi,
  unwrap,
  updatePayload,
  type Item,
} from "../src/api";
const item: Item = {
  id: "i",
  name: "Lock",
  quantity: 1,
  purchasePrice: 100,
  tags: [{ id: "tag", name: "Tech" }],
  parent: { id: "container", name: "Cabinet" },
  location: { id: "room", name: "Room" },
  entityType: { id: "type", name: "Item", isLocation: false },
  fields: [{ id: "field", name: "custom", textValue: "KEEP" }],
  purchaseFrom: "Store",
  soldPrice: 40,
  warrantyDetails: "KEEP",
  lifetimeWarranty: true,
  insured: true,
  notes: "KEEP",
  purchaseDate: "2026-01-01",
  soldDate: "0001-01-01",
  assetId: "123",
};
describe("Homebox compatibility", () => {
  it("retains unedited purchase, sale, warranty, nesting and custom fields in full PUT", () => {
    const data = updatePayload(
      item,
      { name: "Updated", quantity: 2 },
      "entities",
    );
    expect(data).toMatchObject({
      name: "Updated",
      quantity: 2,
      parentId: "container",
      entityTypeId: "type",
      tagIds: ["tag"],
      purchaseFrom: "Store",
      soldPrice: 40,
      warrantyDetails: "KEEP",
      insured: true,
      lifetimeWarranty: true,
      notes: "KEEP",
      fields: item.fields,
      purchaseDate: "2026-01-01",
      assetId: "123",
    });
    expect(data).not.toHaveProperty("locationId");
    expect(data).not.toHaveProperty("attachments");
    expect(data).not.toHaveProperty("createdAt");
  });
  it("uses locationId and original date names for legacy installations", () => {
    const data = updatePayload(
      { ...item, purchaseTime: "2024-01-01" },
      { name: "New" },
      "legacy",
    );
    expect(data.locationId).toBe("room");
    expect(data.parentId).toBe("container");
    expect(data.purchaseTime).toBe("2024-01-01");
    expect(data).not.toHaveProperty("entityTypeId");
    expect(data).not.toHaveProperty("purchaseDate");
  });
  it("uses the exact upstream token and tenant header, with repeated filter parameters", async () => {
    const transport = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
    );
    const api = new HomeboxApi("entities", transport);
    api.session = {
      token: "Bearer opaque",
      attachmentToken: "attachment",
      expiresAt: "2099-01-01",
    };
    api.tenant = "group";
    await api.list({ tags: ["a", "b"], isLocation: false, q: "coffee & tea" });
    const [url, options] = transport.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const query = new URL(url, "http://local").searchParams;
    expect(query.getAll("tags")).toEqual(["a", "b"]);
    expect(query.get("q")).toBe("coffee & tea");
    expect(query.get("isLocation")).toBe("false");
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer opaque",
    );
    expect(new Headers(options.headers).get("X-Tenant")).toBe("group");
  });
  it("fetches all pages of locations", async () => {
    const transport = vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: new URL(String(input), "http://local").searchParams.get(
                  "page",
                ),
                name: "Room",
              },
            ],
            total: 2,
          }),
          { status: 200 },
        ),
    );
    const api = new HomeboxApi("entities", transport);
    expect((await api.locations()).map((l) => l.id)).toEqual(["1", "2"]);
  });
  it("keeps attachment auth scoped to attachment URLs and collection", () => {
    const api = new HomeboxApi();
    api.session = {
      token: "SECRET",
      attachmentToken: "scoped",
      expiresAt: "2099",
    };
    api.tenant = "group";
    const url = api.attachmentUrl("i", "a");
    expect(url).toContain("access_token=scoped");
    expect(url).toContain("tenant=group");
    expect(url).not.toContain("SECRET");
  });
  it("does not send a JSON content type for multipart uploads", async () => {
    const transport = vi.fn(async () => new Response("{}"));
    const api = new HomeboxApi("entities", transport);
    await api.upload("i", new File(["photo"], "p.jpg"), "photo");
    const [, options] = transport.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(options.body).toBeInstanceOf(FormData);
    expect(new Headers(options.headers).has("Content-Type")).toBe(false);
    expect((options.body as FormData).get("type")).toBe("photo");
  });
  it("returns a typed session error on unauthorized requests", async () => {
    const api = new HomeboxApi(
      "entities",
      async () => new Response("{}", { status: 401 }),
    );
    await expect(api.stats()).rejects.toMatchObject({ status: 401 });
  });
  it("unwraps user responses but retains paginated lists", () => {
    expect(unwrap({ item: { name: "Can" } })).toEqual({ name: "Can" });
    expect(unwrap({ items: [] })).toEqual({ items: [] });
  });
});
