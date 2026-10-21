import { test, expect } from "@playwright/test";
import { loginWithInventory } from "./homebox-fixture";
test("authenticated inventory: search, details, edit, delete, filters and dark mode", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginWithInventory(page);
  await expect(
    page.getByRole("heading", { name: "Evine bir bakış." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Siemens EQ700/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ürün adı", { exact: true }).fill("Kahve köşesi");
  await page.getByRole("button", { name: "Ürünü kaydet" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Kahve köşesi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pencereyi kapat" }).click();
  await page
    .getByRole("searchbox", { name: "Envanterde ara" })
    .fill("Kahve köşesi");
  await expect(page.locator(".item-card")).toHaveCount(1);
  await page.locator(".item-card").click();
  await page.getByRole("button", { name: "Sil", exact: true }).click();
  await page.getByRole("button", { name: "Evet, sil" }).click();
  await expect(
    page.getByRole("heading", { name: "Eşleşen ürün bulunamadı" }),
  ).toBeVisible();
  if (info.project.name !== "desktop")
    await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page
    .getByRole("navigation", { name: "Ana menü" })
    .getByRole("button", { name: "Konumlar", exact: true })
    .click();
  await page.getByRole("button", { name: "Ürünleri gör" }).first().click();
  await expect(
    page.getByRole("combobox", { name: "Konuma göre filtrele" }),
  ).toHaveValue("living");
  await expect(page.locator(".item-card")).toHaveCount(2);
  if (info.project.name !== "desktop")
    await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page
    .getByRole("navigation", { name: "Ana menü" })
    .getByRole("button", { name: "Koyu görünüm" })
    .click();
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
      if (path === "/entity-types")
        expect(request.headers()["x-tenant"]).toBe("g");
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
  await loginWithInventory(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ürün ekle" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("authenticated inventory: custom fields on an item and field templates", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginWithInventory(page);
  await page.getByRole("button", { name: /Siemens EQ700/ }).click();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByRole("button", { name: "Alan ekle" }).click();
  await page.getByLabel("Alan adı").fill("Voltaj");
  await page.getByLabel("Alan değeri").fill("230V");
  await page.getByRole("button", { name: "Ürünü kaydet" }).click();
  await expect(page.getByRole("dialog").getByText("230V")).toBeVisible();
  await page.getByRole("button", { name: "Pencereyi kapat" }).click();
  if (info.project.name !== "desktop")
    await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page
    .getByRole("button", { name: "Alan şablonları", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Ağ cihazı" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("login is required and failed authentication never opens sample inventory", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 401, json: { error: "unauthorized" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Örnek envanter|Demoyu/i }),
  ).toHaveCount(0);
  await page.getByLabel("E-posta", { exact: true }).fill("test@example.com");
  await page.getByLabel("Şifre", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evine hoş geldin." }),
  ).toBeVisible();
  await expect(page.locator(".item-card")).toHaveCount(0);
});

test("simple login: no connection options, readable inputs and password visibility", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("Bağlantı seçenekleri")).toHaveCount(0);
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  const password = page.getByLabel("Şifre", { exact: true });
  await password.fill("test-password");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Şifreyi göster", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Şifreyi gizle", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  const metrics = await password.evaluate((input) => ({
    fontSize: parseFloat(getComputedStyle(input).fontSize),
    height: input.getBoundingClientRect().height,
  }));
  expect(metrics.fontSize).toBeGreaterThanOrEqual(16);
  expect(metrics.height).toBeGreaterThanOrEqual(48);
  expect(
    await page
      .getByRole("button", { name: "Giriş yap", exact: true })
      .evaluate((button) => button.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(48);
});

test("responsive navigation, forms and list remain usable on narrow phones and tablets", async ({
  page,
}, info) => {
  await page.addInitScript(() => localStorage.setItem("hb-mode", "legacy"));
  await loginWithInventory(page);
  for (const width of [320, 390, 820, 1180, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bottom = page.getByRole("navigation", { name: "Hızlı gezinme" });
    if (width < 1280) {
      await expect(bottom).toBeVisible();
      const open = page.getByRole("button", { name: "Menüyü aç", exact: true });
      expect(
        await open.evaluate((button) => button.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      await open.click();
      await expect(page.locator(".navigation-drawer")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".navigation-drawer")).not.toBeVisible();
    } else await expect(bottom).not.toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Liste görünümü" }).click();
  await expect(page.getByTestId("mobile-inventory-list")).toBeVisible();
  await page.getByRole("button", { name: "Ürün ekle", exact: true }).click();
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.getByLabel("Ürün adı", { exact: true }) });
  await expect(dialog).toBeVisible();
  const nameBox = await page
    .getByLabel("Ürün adı", { exact: true })
    .boundingBox();
  const brandBox = await page
    .getByLabel("Marka", { exact: true })
    .boundingBox();
  const modelBox = await page
    .getByLabel("Model", { exact: true })
    .boundingBox();
  expect(nameBox!.width).toBeGreaterThan(300);
  expect(modelBox!.y).toBeGreaterThan(brandBox!.y);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  const originalSize = info.project.use.viewport!;
  await page.setViewportSize(originalSize);
});

test("supplied SVG logo preserves its proportions and follows light and dark themes", async ({
  page,
}, info) => {
  await page.goto("/");
  const loginLogo = page.getByRole("img", { name: "Homebox", exact: true });
  await expect(loginLogo).toBeVisible();
  const rect = await loginLogo.boundingBox();
  expect(rect!.width / rect!.height).toBeCloseTo(263 / 45, 2);
  expect(await loginLogo.locator("path").count()).toBe(13);
  const lightText = await loginLogo
    .locator(".logo-text")
    .evaluate((path) => getComputedStyle(path).fill);
  expect(lightText).not.toBe("none");
  const accent = await loginLogo
    .locator(".logo-accent")
    .evaluate((path) => getComputedStyle(path).fill);
  expect(accent).not.toBe("none");
  await page.screenshot({
    path: `/workspace/scratch/3c7ddd8e74ec/qa-branded-login-${info.project.name}.png`,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const darkText = await loginLogo
    .locator(".logo-text")
    .evaluate((path) => getComputedStyle(path).fill);
  expect(darkText).not.toBe(lightText);
  expect(darkText).not.toBe("none");
  await page.screenshot({
    path: `/workspace/scratch/3c7ddd8e74ec/qa-branded-dark-${info.project.name}.png`,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await loginWithInventory(page);
  const appLogo = page.getByRole("img", { name: "Homebox", exact: true });
  await expect(appLogo).toHaveCount(1);
  await expect(appLogo).toBeVisible();
  if (info.project.name !== "desktop") {
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    await expect(
      page
        .locator(".navigation-drawer")
        .getByRole("img", { name: "Homebox", exact: true }),
    ).toBeVisible();
  }
});
