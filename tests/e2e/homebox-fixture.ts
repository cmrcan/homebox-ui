import { expect, type Page } from "@playwright/test";
import type { Item, Template } from "../../src/api";

/** Test-only API data: the application always follows the authenticated path. */
export async function loginWithInventory(page: Page) {
  const locations = [
    { id: "living", name: "Salon", itemCount: 2 },
    { id: "kitchen", name: "Mutfak", itemCount: 1 },
  ];
  let items: Item[] = [
    ["coffee", "Siemens EQ700", "kitchen"],
    ["lock", "Yale Linus L2", "living"],
    ["speaker", "Apple HomePod mini", "living"],
  ].map(([id, name, room]) => ({
    id,
    name,
    description: "Test kaydı",
    quantity: 1,
    purchasePrice: 100,
    tags: [],
    parent: locations.find((l) => l.id === room),
    entityType: { id: "item", name: "Ürün", isLocation: false },
    fields: [],
    attachments: [],
  }));
  const templates: Template[] = [
    {
      id: "network",
      name: "Ağ cihazı",
      fields: [{ name: "IP adresi", type: "text", textValue: "" }],
    },
  ];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    let data: unknown;
    if (path === "/users/login") {
      data = {
        token: "Bearer fixture",
        attachmentToken: "files",
        expiresAt: "2099-01-01",
      };
    } else {
      expect(request.headers().authorization).toBe("Bearer fixture");
      if (path === "/entity-types")
        expect(request.headers()["x-tenant"]).toBe("g");
      if (path === "/users/self")
        data = { item: { name: "Test Kullanıcı", email: "test@example.com" } };
      else if (path === "/groups/all")
        data = [{ id: "g", name: "Ev", currency: "TRY" }];
      else if (path === "/groups/statistics")
        data = {
          totalItems: items.length,
          totalItemPrice: items.length * 100,
          totalLocations: locations.length,
          totalTags: 0,
          totalWithWarranty: 0,
        };
      else if (path === "/tags") data = [];
      else if (path === "/entity-types")
        data = [
          { id: "item", name: "Ürün", isLocation: false },
          { id: "room", name: "Oda", isLocation: true },
        ];
      else if (path === "/templates") data = templates;
      else if (path === "/templates/network") data = templates[0];
      else if (path === "/entities") {
        if (url.searchParams.get("isLocation") === "true")
          data = { items: locations, total: locations.length };
        else {
          const query = (url.searchParams.get("q") || "").toLocaleLowerCase(
            "tr",
          );
          const parent = url.searchParams.get("parentIds");
          const filtered = items.filter(
            (item) =>
              item.name.toLocaleLowerCase("tr").includes(query) &&
              (!parent || item.parent?.id === parent),
          );
          data = {
            items: filtered,
            total: filtered.length,
            totalPrice: filtered.length * 100,
            page: 1,
            pageSize: 12,
          };
        }
      } else if (path.startsWith("/entities/")) {
        const id = path.split("/")[2];
        const item = items.find((item) => item.id === id);
        expect(item, `API item ${id}`).toBeTruthy();
        if (request.method() === "PUT") {
          Object.assign(item!, request.postDataJSON());
          item!.parent =
            locations.find((l) => l.id === request.postDataJSON().parentId) ||
            null;
        } else if (request.method() === "DELETE")
          items = items.filter((item) => item.id !== id);
        data = item;
      } else if (path === "/users/logout") data = {};
      else throw new Error(`Unexpected endpoint ${request.method()} ${path}`);
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/");
  await page.getByLabel("E-posta", { exact: true }).fill("test@example.com");
  await page.getByLabel("Şifre", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.locator(".item-card")).toHaveCount(3);
}
