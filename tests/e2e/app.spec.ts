import { test, expect } from "@playwright/test";
test("demo search, details, edit and delete; filters and dark mode", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Örnek envanterle arayüzü keşfet" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evine bir bakış." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Siemens EQ700/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ürün adı", { exact: true }).fill("Kahve köşesi");
  await page.getByRole("button", { name: "Ürünü kaydet" }).click();
  await page
    .getByRole("textbox", { name: "Envanterde ara" })
    .fill("Kahve köşesi");
  await expect(page.locator(".item-card")).toHaveCount(1);
  await page.locator(".item-card").click();
  await page.getByRole("button", { name: "Sil", exact: true }).click();
  await page.getByRole("button", { name: "Evet, sil" }).click();
  await expect(
    page.getByRole("heading", { name: "Eşleşen ürün bulunamadı" }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Konumlar", exact: true }).click();
  await page.getByRole("button", { name: "Ürünleri gör" }).first().click();
  await expect(
    page.getByRole("combobox", { name: "Konuma göre filtrele" }),
  ).toHaveValue("living");
  await expect(page.locator(".item-card")).toHaveCount(2);
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Koyu görünüm" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  expect(errors).toEqual([]);
});
test("authenticated Homebox entity API: login, create, upload, and expiry", async ({
  page,
}) => {
  const entities: any[] = [];
  const writes: any[] = [];
  const fullItem = (body: any) => ({
    id: "new",
    name: body.name,
    description: body.description,
    quantity: body.quantity,
    tags: [],
    entityType: { id: "type", name: "Ürün", isLocation: false },
    fields: [],
    attachments: [],
    purchasePrice: 0,
    parent: null,
    ...body,
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace("/api/v1", "");
    let data: any;
    if (path === "/users/login") {
      expect(request.postDataJSON().username).toBe("can@example.com");
      data = {
        token: "Bearer session",
        attachmentToken: "scoped",
        expiresAt: "2099-01-01",
      };
    } else {
      expect(request.headers().authorization).toBe("Bearer session");
      if (path === "/users/self")
        data = { item: { name: "Can", email: "can@example.com" } };
      else if (path === "/groups/all")
        data = [{ id: "g", name: "Ev", currency: "TRY" }];
      else if (path === "/groups/statistics")
        data = {
          totalItems: entities.length,
          totalLocations: 1,
          totalTags: 0,
          totalItemPrice: 0,
          totalWithWarranty: 0,
        };
      else if (path === "/tags") data = [];
      else if (path === "/entity-types")
        data = [
          { id: "type", name: "Ürün", isLocation: false },
          { id: "room-type", name: "Oda", isLocation: true },
        ];
      else if (path === "/entities" && request.method() === "POST") {
        data = fullItem(request.postDataJSON());
        entities.push(data);
        writes.push(request.postDataJSON());
      } else if (path === "/entities/new" && request.method() === "PUT") {
        data = fullItem(request.postDataJSON());
        entities[0] = data;
        writes.push(data);
      } else if (path === "/entities/new/attachments") {
        expect(request.headers()["content-type"]).toContain(
          "multipart/form-data",
        );
        entities[0].attachments = [
          { id: "a", title: "fatura.txt", type: "receipt" },
        ];
        data = entities[0];
      } else if (path === "/entities/new") data = entities[0];
      else if (path === "/entities") {
        data =
          url.searchParams.get("isLocation") === "true"
            ? {
                items: [
                  {
                    id: "room",
                    name: "Salon",
                    entityType: {
                      id: "room-type",
                      name: "Oda",
                      isLocation: true,
                    },
                  },
                ],
                total: 1,
              }
            : {
                items: entities,
                total: entities.length,
                page: 1,
                pageSize: 12,
                totalPrice: 0,
              };
      } else if (path === "/users/logout") data = {};
      else throw new Error("Unexpected endpoint " + path);
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/");
  await page.getByLabel("E-posta", { exact: true }).fill("can@example.com");
  await page.getByLabel("Şifre", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await page.getByRole("button", { name: "Ürün ekle", exact: true }).click();
  await page.getByLabel("Ürün adı", { exact: true }).fill("Test ürün");
  await page.getByLabel("Satın alma değeri (TRY)", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Ürünü kaydet" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Test ürün", exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[0].entityTypeId).toBe("type");
  expect(writes[1].purchasePrice).toBe(123);
  await page
    .getByRole("combobox", { name: "Dosya türü" })
    .selectOption("receipt");
  await page.locator("input[type=file]").setInputFiles({
    name: "fatura.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(page.getByRole("link", { name: "fatura.txt" })).toBeVisible();
  await page.getByRole("button", { name: "Pencereyi kapat" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Evine bir bakış." }),
  ).toBeVisible();
  await page.unrouteAll();
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 401, json: { error: "unauthorized" } }),
  );
  await page.getByRole("button", { name: "Verileri yenile" }).click();
  await expect(
    page.getByRole("heading", { name: "Evine hoş geldin." }),
  ).toBeVisible();
});
test("layout has no horizontal overflow; Escape closes the modal", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Örnek envanterle arayüzü keşfet" })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ürün ekle" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
