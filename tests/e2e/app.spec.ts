import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loginWithInventory } from "./homebox-fixture";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("hb-theme"))
      localStorage.setItem("hb-theme", "light");
  });
});
async function navigate(page: Page, name: string) {
  const sidebar = page.getByRole("navigation", {
    name: "Ana menü",
    exact: true,
  });
  const item = sidebar.getByRole("treeitem", { name, exact: true });
  const itemBox = (await item.isVisible()) ? await item.boundingBox() : null;
  if (!itemBox || itemBox.x < 0 || itemBox.x >= page.viewportSize()!.width)
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  await sidebar.getByRole("treeitem", { name, exact: true }).click();
  await expect(
    page
      .locator(".sapMPage:visible")
      .getByRole("heading", { name, exact: true }),
  ).toBeVisible();
}

async function shellAction(page: Page, name: string) {
  const action = page.getByRole("button", { name, exact: true });
  if (!(await action.isVisible()))
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Ek seçenekler", exact: true })
      .click();
  await action.click();
}

async function objectAction(page: Page, name: string) {
  const overflow = page
    .locator(".sapMPage:visible .sapFDynamicPageTitle")
    .getByRole("button", { name: "Ek seçenekler", exact: true });
  await overflow.click();
  await page.getByRole("button", { name, exact: true }).click();
}

test("OpenUI5 inventory supports search, edit, confirmed deletion and location filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginWithInventory(page);
  await page
    .getByRole("button", { name: "Siemens EQ700", exact: true })
    .click();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ürün adı", { exact: true }).fill("Kahve köşesi");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kahve köşesi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Envanterde ara" })
    .fill("Kahve köşesi");
  await expect(page.locator(".sapFCard:visible")).toHaveCount(1);
  await page.getByRole("button", { name: "Kahve köşesi", exact: true }).click();
  await objectAction(page, "Sil");
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kahve köşesi", exact: true }),
  ).toBeVisible();
  await objectAction(page, "Sil");
  await page.getByRole("button", { name: "Evet, sil", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Eşleşen ürün bulunamadı" }),
  ).toBeVisible();
  await navigate(page, "Konumlar");
  await page
    .getByRole("button", { name: "Ürünleri gör", exact: true })
    .first()
    .click();
  await expect(page.locator(".sapFCard:visible")).toHaveCount(2);
  await expect(
    page.getByRole("combobox", { name: "Konuma göre filtrele" }),
  ).toContainText("Salon");
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
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(
    page.getByRole("heading", { name: "Test ürün", exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[0].entityTypeId).toBe("type");
  expect(writes[1].purchasePrice).toBe(123);
  await page
    .getByRole("combobox", { name: "Dosya türü" })
    .locator("..")
    .click();
  await page.getByRole("option", { name: "Fatura", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "fatura.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(page.getByRole("link", { name: "fatura.txt" })).toBeVisible();
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await page.reload();
  await expect(
    page
      .locator(".sapMPage:visible")
      .getByRole("heading", { name: "Envanterim", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sapFCard:visible")).toHaveCount(1);
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 401, json: { error: "unauthorized" } }),
  );
  await shellAction(page, "Verileri yenile");
  await expect(
    page.getByRole("heading", { name: "Evine hoş geldin." }),
  ).toBeVisible();
});

test("item custom fields and template management remain available", async ({
  page,
}) => {
  await loginWithInventory(page);
  await page
    .getByRole("button", { name: "Siemens EQ700", exact: true })
    .click();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByRole("button", { name: "Alan ekle", exact: true }).click();
  await page.getByLabel("Alan adı", { exact: true }).fill("Voltaj");
  await page.getByLabel("Alan değeri", { exact: true }).fill("230V");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("230V", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await navigate(page, "Alan şablonları");
  await expect(page.getByText("Ağ cihazı", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(page.getByLabel("Şablon adı", { exact: true })).toHaveValue(
    "Ağ cihazı",
  );
  await expect(page.getByLabel("Alan adı", { exact: true })).toHaveValue(
    "IP adresi",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("failed login keeps inventory inaccessible; password visibility and registration work", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 401, json: { error: "unauthorized" } }),
  );
  await page.goto("/");
  const password = page.getByLabel("Şifre", { exact: true });
  await password.fill("invalid");
  await page
    .getByRole("button", { name: "Şifreyi göster", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Şifreyi gizle", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByLabel("E-posta", { exact: true }).fill("test@example.com");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByRole("note", { name: /Oturum sona erdi/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evine hoş geldin." }),
  ).toBeVisible();
  await expect(page.locator(".sapFCard:visible")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Örnek envanter|Demoyu/i }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Davet ile hesap oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Davet kodu", { exact: true }),
  ).toBeVisible();
});

test("Horizon theme persists after reload and resources stay on the same origin", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (
      !req.url().startsWith("http://127.0.0.1:5173") &&
      !req.url().startsWith("data:")
    )
      external.push(req.url());
  });
  await loginWithInventory(page);
  const themeId = (await page
    .locator(".sapTntToolPage")
    .getAttribute("id"))!.replace(/toolPage$/, "themeButton");
  const icon = () =>
    page.evaluate(
      (id) =>
        new Promise<string>((resolve) =>
          (window as any).sap.ui.require(
            ["sap/ui/core/Element"],
            (Element: any) => resolve(Element.getElementById(id).getIcon()),
          ),
        ),
      themeId,
    );
  expect(await icon()).toBe("sap-icon://dark-mode");
  await shellAction(page, "Koyu görünüm");
  await expect.poll(icon).toBe("sap-icon://light-mode");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('link[id="sap-ui-theme-sap.m"]')).toHaveAttribute(
    "href",
    /sap_horizon_dark/,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Evine bir bakış." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(external).toEqual([]);
});

test("OpenUI5 forms, menu and responsive table fit phones and tablets", async ({
  page,
}) => {
  await loginWithInventory(page);
  for (const width of [320, 390, 820, 1180, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Ana menü", exact: true }),
  ).not.toBeInViewport();
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Ana menü" }),
  ).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Liste görünümü", exact: true })
    .click();
  await expect(page.getByRole("grid")).toBeVisible();
  await page.getByRole("button", { name: "Ürün ekle", exact: true }).click();
  await expect(page).toHaveURL(/#\/?inventory\/new$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const name = await page.getByLabel("Ürün adı", { exact: true }).boundingBox();
  expect(name!.width).toBeGreaterThan(250);
  await expect
    .poll(() =>
      page
        .locator(".sapMPage:visible")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(page).toHaveURL(/#\/?inventory$/);
});

test("built runtime loads compiled styles, preserves logo and respects production CSP", async ({
  page,
}) => {
  const template = readFileSync("deploy/default.conf.template", "utf8");
  const policy = template.match(/Content-Security-Policy "([^"]+)"/)![1];
  const blocked: string[] = [];
  await page.route("http://127.0.0.1:5173/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "content-security-policy": policy },
    });
  });
  page.on("console", (m) => {
    if (
      m.text().includes("Content Security Policy") ||
      m.text().includes("violates the following")
    )
      blocked.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Giriş yap", exact: true }),
  ).toBeVisible();
  const logo = page.getByRole("img", { name: "Homebox", exact: true });
  const box = await logo.boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(263 / 45, 1);
  expect(
    await page
      .getByRole("button", { name: "Giriş yap", exact: true })
      .evaluate(
        (el) =>
          getComputedStyle(el.querySelector(".sapMBtnInner")!).borderRadius,
      ),
  ).not.toBe("0px");
  await expect(page.locator("#sap-ui-theme-sap\\.m")).toHaveAttribute(
    "href",
    /sap_horizon/,
  );
  expect(blocked).toEqual([]);
});

test("entity type creation and field template editing send complete API values", async ({
  page,
}) => {
  await loginWithInventory(page);
  const types = [
    { id: "item", name: "Ürün", isLocation: false },
    { id: "room", name: "Oda", isLocation: true },
  ];
  const templates: any[] = [
    {
      id: "network",
      name: "Ağ cihazı",
      defaultInsured: true,
      fields: [{ name: "IP adresi", type: "text", textValue: "" }],
    },
  ];
  const writes: any[] = [];
  await page.route("**/api/v1/entity-types**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      writes.push(body);
      types.push({ id: "new-type", ...body });
      await route.fulfill({ json: types.at(-1) });
    } else if (req.method() === "PUT") {
      const body = req.postDataJSON();
      writes.push(body);
      const existing = types.find((t) => t.id === body.id)!;
      Object.assign(existing, body);
      await route.fulfill({ json: existing });
    } else await route.fulfill({ json: types });
  });
  await page.route("**/api/v1/templates**", async (route) => {
    const req = route.request();
    if (req.method() === "PUT") {
      const body = req.postDataJSON();
      writes.push(body);
      Object.assign(templates[0], body);
      await route.fulfill({ json: templates[0] });
    } else
      await route.fulfill({
        json: new URL(req.url()).pathname.endsWith("/templates")
          ? templates
          : templates[0],
      });
  });
  await navigate(page, "Ürün türleri");
  await page.getByRole("button", { name: "Tür ekle", exact: true }).click();
  await page.getByLabel("Tür adı", { exact: true }).fill("Elektronik");
  await page.getByRole("button", { name: "Türü kaydet", exact: true }).click();
  await expect(page.getByText("Elektronik", { exact: true })).toBeVisible();
  expect(writes[0]).toMatchObject({ name: "Elektronik", isLocation: false });
  await page
    .locator(".sapMPage:visible .sapMPanel")
    .filter({ has: page.getByText("Elektronik", { exact: true }) })
    .getByRole("button", { name: "Düzenle", exact: true })
    .click();
  await page.getByLabel("Tür adı", { exact: true }).fill("Elektronik cihazlar");
  await page.getByRole("button", { name: "Türü kaydet", exact: true }).click();
  await expect(
    page.getByText("Elektronik cihazlar", { exact: true }),
  ).toBeVisible();
  expect(writes[1]).toMatchObject({
    id: "new-type",
    name: "Elektronik cihazlar",
  });
  expect(writes[1]).not.toHaveProperty("templateId");
  await navigate(page, "Alan şablonları");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Şablon adı", { exact: true }).fill("Ağ donanımı");
  await page.getByLabel("Alan değeri", { exact: true }).fill("10.10.20.1");
  await page
    .getByRole("button", { name: "Şablonu kaydet", exact: true })
    .click();
  await expect(page.getByText("Ağ donanımı", { exact: true })).toBeVisible();
  expect(writes[2]).toMatchObject({
    defaultInsured: true,
    name: "Ağ donanımı",
    fields: [{ name: "IP adresi", type: "text", textValue: "10.10.20.1" }],
  });
});

test("item maintenance, profile saving and CSV export remain functional", async ({
  page,
}) => {
  await loginWithInventory(page);
  const maintenance: any[] = [];
  const writes: any[] = [];
  await page.route("**/api/v1/entities/coffee/maintenance", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      writes.push(body);
      maintenance.push({ id: "m", ...body });
      await route.fulfill({ json: maintenance[0] });
    } else await route.fulfill({ json: maintenance });
  });
  await page
    .getByRole("button", { name: "Siemens EQ700", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bakım kayıtlarını göster", exact: true })
    .click();
  await page.getByLabel("Bakım adı", { exact: true }).fill("Kireç temizliği");
  await page.getByLabel("Maliyet", { exact: true }).fill("90");
  await page
    .getByRole("button", { name: "Bakımı kaydet", exact: true })
    .click();
  await expect(
    page.getByText("Kireç temizliği", { exact: true }),
  ).toBeVisible();
  expect(writes[0]).toMatchObject({
    name: "Kireç temizliği",
    cost: "90",
    completedDate: "0001-01-01",
  });
  await page.getByRole("button", { name: "Geri", exact: true }).click();
  await page.route("**/api/v1/groups/members", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/users/self", async (route) => {
    const body = route.request().postDataJSON();
    writes.push(body);
    await route.fulfill({ json: { item: body } });
  });
  await navigate(page, "Kullanıcılar");
  await page.getByLabel("Ad soyad", { exact: true }).fill("Can");
  await page
    .getByRole("button", { name: "Profili kaydet", exact: true })
    .click();
  await expect.poll(() => writes.at(-1)?.name).toBe("Can");
  await page.route("**/api/v1/notifiers", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/entities/export", (route) =>
    route.fulfill({
      body: "name,quantity\nSiemens,1",
      contentType: "text/csv",
    }),
  );
  await navigate(page, "Araçlar");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "CSV dışa aktar", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("homebox-envanter.csv");
});

test("native MVC component, ToolPage and router restore a deep-linked inventory page", async ({
  page,
}) => {
  await loginWithInventory(page);
  await page.goto("/#inventory");
  await expect(
    page
      .locator(".sapMPage:visible")
      .getByRole("heading", { name: "Envanterim", exact: true }),
  ).toBeVisible();
  const toolPageId = await page.locator(".sapTntToolPage").getAttribute("id");
  const shape = await page.evaluate(
    async (id) =>
      new Promise((resolve, reject) => {
        (window as any).sap.ui.require(
          ["sap/ui/core/Element", "sap/ui/core/Component"],
          (Element: any, Component: any) => {
            try {
              const component = Component.getOwnerComponentFor(
                Element.getElementById(id),
              );
              const root = component.getRootControl();
              resolve({
                xml: root.isA("sap.ui.core.mvc.XMLView"),
                model: component.getModel().isA("sap.ui.model.json.JSONModel"),
                component: component.getMetadata().getName(),
                router: component.getRouter().getMetadata().getName(),
                toolPage: root.byId("toolPage").isA("sap.tnt.ToolPage"),
                header: root.byId("toolHeader").isA("sap.tnt.ToolHeader"),
                navigation: root
                  .byId("sideNavigation")
                  .isA("sap.tnt.SideNavigation"),
              });
            } catch (error) {
              reject(error);
            }
          },
          reject,
        );
      }),
    toolPageId,
  );
  expect(shape).toEqual({
    xml: true,
    model: true,
    component: "homebox.Component",
    router: "sap.m.routing.Router",
    toolPage: true,
    header: true,
    navigation: true,
  });
  await expect(
    page.getByRole("banner").getByRole("img", { name: "Homebox", exact: true }),
  ).toBeVisible();
});

test("ToolHeader collection selection reloads inventory with the new tenant", async ({
  page,
}) => {
  await loginWithInventory(page);
  await page.route("**/api/v1/groups/all", (route) =>
    route.fulfill({
      json: [
        { id: "g", name: "Ev", currency: "TRY" },
        { id: "h", name: "İkinci ev", currency: "USD" },
      ],
    }),
  );
  await page.route("**/api/v1/entity-types", (route) =>
    route.fulfill({
      json: [
        { id: "item", name: "Ürün", isLocation: false },
        { id: "room", name: "Oda", isLocation: true },
      ],
    }),
  );
  await page.route("**/api/v1/entities?*", async (route) => {
    if (route.request().headers()["x-tenant"] !== "h") {
      await route.fallback();
      return;
    }
    const isLocation =
      new URL(route.request().url()).searchParams.get("isLocation") === "true";
    const items = isLocation
      ? []
      : [
          {
            id: "second",
            name: "Yeni koleksiyon ürünü",
            quantity: 1,
            purchasePrice: 50,
            tags: [],
            parent: null,
            entityType: { id: "item", name: "Ürün", isLocation: false },
          },
        ];
    await route.fulfill({
      json: {
        items,
        total: items.length,
        totalPrice: 50,
        page: 1,
        pageSize: 12,
      },
    });
  });
  await page.reload();
  await expect(page.locator(".sapFCard:visible")).toHaveCount(3);
  const collection = page.getByRole("combobox", {
    name: "Koleksiyon",
    exact: true,
  });
  if (!(await collection.isVisible()))
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Ek seçenekler", exact: true })
      .click();
  await collection.locator("..").click();
  await page.getByRole("option", { name: "İkinci ev", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sapFCard:visible")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Yeni koleksiyon ürünü", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sapFCard:visible")).not.toContainText(
    "Siemens EQ700",
  );
});

test("an expanded mobile menu survives resizing within the phone layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithInventory(page);
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const navigation = page.getByRole("navigation", {
    name: "Ana menü",
    exact: true,
  });
  await expect(navigation).toBeInViewport();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        (window as any).__ui5ResizeObserved = false;
        (window as any).sap.ui.require(["sap/ui/Device"], (Device: any) => {
          const observe = () => {
            (window as any).__ui5ResizeObserved = true;
            Device.resize.detachHandler(observe);
          };
          Device.resize.attachHandler(observe);
          resolve();
        });
      }),
  );
  await page.setViewportSize({ width: 390, height: 820 });
  await page.waitForFunction(() => (window as any).__ui5ResizeObserved);
  await expect(navigation).toBeInViewport();
  await navigation
    .getByRole("treeitem", { name: "Konumlar", exact: true })
    .click();
  await expect(
    page
      .locator(".sapMPage:visible")
      .getByRole("heading", { name: "Konumlar", exact: true }),
  ).toBeVisible();
  await expect(navigation).not.toBeInViewport();
});

test("object routes restore detail pages, breadcrumbs and footer edits without dialogs", async ({
  page,
}) => {
  await loginWithInventory(page);
  await page.goto("/#inventory/coffee");
  await expect(
    page.getByRole("heading", { name: "Siemens EQ700", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Dolaşma yolu" }),
  ).toContainText("Mutfak");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  const footer = page.locator(
    ".sapMPage:visible .sapUxAPObjectPageFloatingFooter",
  );
  await expect(
    footer.getByRole("button", { name: "Kaydet", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Ürün adı", { exact: true })
    .fill("Kaydedilmeyen değişiklik");
  await footer.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Siemens EQ700", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Siemens EQ700", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.route("**/api/v1/entities/coffee", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 503,
        json: { error: "Kayıt servisi geçici olarak kapalı" },
      });
    else await route.fallback();
  });
  await page
    .getByLabel("Ürün adı", { exact: true })
    .fill("Tekrar denenecek kayıt");
  await footer.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("note")).toContainText(
    "Kayıt servisi geçici olarak kapalı",
  );
  await expect(page.getByLabel("Ürün adı", { exact: true })).toHaveValue(
    "Tekrar denenecek kayıt",
  );
  await expect(
    footer.getByRole("button", { name: "Kaydet", exact: true }),
  ).toBeEnabled();
});

test("location details edit and cancel through the page footer and survive reload", async ({
  page,
}) => {
  await loginWithInventory(page);
  await navigate(page, "Konumlar");
  await page
    .getByRole("button", { name: "Detayı aç", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#\/?locations\/living$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Dolaşma yolu" }),
  ).toContainText("Konumlar");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Deneme");
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(
    page
      .locator(".sapMPage:visible .sapFDynamicPageTitle")
      .getByRole("heading", { name: "Salon", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Ad", { exact: true }).fill("Oturma odası");
  await page
    .locator(".sapMPage:visible .sapUxAPObjectPageFloatingFooter")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(
    page
      .locator(".sapMPage:visible .sapFDynamicPageTitle")
      .getByRole("heading", { name: "Oturma odası", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".sapMPage:visible .sapFDynamicPageTitle")
      .getByRole("heading", { name: "Oturma odası", exact: true }),
  ).toBeVisible();
  await objectAction(page, "Ürünleri gör");
  await expect(page).toHaveURL(/#\/?inventory$/);
  await expect(page.locator(".sapFCard:visible")).toHaveCount(2);
});

test("inventory native cards stay equal sized and the filtered table exposes full records", async ({
  page,
}) => {
  await loginWithInventory(page);
  const cards = page.locator(".sapFCard:visible");
  const sizes = await cards.evaluateAll((els) =>
    els.map((el) => ({
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height),
    })),
  );
  expect(new Set(sizes.map((s) => s.width)).size).toBe(1);
  expect(new Set(sizes.map((s) => s.height)).size).toBe(1);
  expect(sizes[0].height).toBe(336);
  await page
    .getByRole("button", { name: "Liste görünümü", exact: true })
    .click();
  const table = page.getByRole("grid");
  await expect(table).toBeVisible();
  await expect(table).toContainText("Siemens EQ700");
  const columnCount = await table.evaluate(
    async (el) =>
      new Promise<number>((resolve) =>
        (window as any).sap.ui.require(
          ["sap/ui/core/Element"],
          (Element: any) =>
            resolve(
              Element.getElementById(el.closest(".sapMList")!.id).getColumns()
                .length,
            ),
        ),
      ),
  );
  expect(columnCount).toBe(13);
  const sorted = page.waitForRequest(
    (req) =>
      req.url().includes("/entities?") &&
      new URL(req.url()).searchParams.get("orderBy") === "name",
  );
  await page
    .getByRole("combobox", { name: "Sıralama", exact: true })
    .locator("..")
    .click();
  await page.getByRole("option", { name: "Ürün adı", exact: true }).click();
  await sorted;
  await page
    .getByRole("searchbox", { name: "Envanterde ara", exact: true })
    .fill("Siemens");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Filtreleri temizle", exact: true })
    .click();
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  const appCss = page.locator('link[href*="css/style.css"]');
  await expect(appCss).toHaveCount(0);
});

test("new locations and tags use routed forms and save through footer actions", async ({
  page,
}) => {
  await loginWithInventory(page);
  const records: Record<string, any> = {};
  await page.route("**/api/v1/entities", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      name: "Çalışma odası",
      quantity: 1,
      tagIds: [],
      entityTypeId: "room",
    });
    records.room = {
      id: "new-room",
      ...body,
      entityType: { id: "room", name: "Oda", isLocation: true },
    };
    await route.fulfill({ json: records.room });
  });
  await page.route("**/api/v1/entities/new-room", (route) =>
    route.fulfill({ json: records.room }),
  );
  await page.route("**/api/v1/tags", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.name).toBe("Elektronik");
      records.tag = { id: "new-tag", ...body };
      await route.fulfill({ json: records.tag });
    } else await route.fulfill({ json: records.tag ? [records.tag] : [] });
  });
  await page.route("**/api/v1/tags/new-tag", (route) =>
    route.fulfill({ json: records.tag }),
  );
  await navigate(page, "Konumlar");
  await page.getByRole("button", { name: "Konum ekle", exact: true }).click();
  await expect(page).toHaveURL(/#\/?locations\/new$/);
  await page.getByLabel("Ad", { exact: true }).fill("Çalışma odası");
  await page
    .locator(".sapMPage:visible .sapUxAPObjectPageFloatingFooter")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/?locations\/new-room$/);
  await expect(
    page
      .locator(".sapMPage:visible .sapFDynamicPageTitle")
      .getByRole("heading", { name: "Çalışma odası", exact: true }),
  ).toBeVisible();
  await navigate(page, "Etiketler");
  await page.getByRole("button", { name: "Etiket ekle", exact: true }).click();
  await expect(page).toHaveURL(/#\/?tags\/new$/);
  await page.getByLabel("Ad", { exact: true }).fill("Elektronik");
  await page
    .locator(".sapMPage:visible .sapUxAPObjectPageFloatingFooter")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/?tags\/new-tag$/);
  await expect(
    page
      .locator(".sapMPage:visible .sapFDynamicPageTitle")
      .getByRole("heading", { name: "Elektronik", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("overview statistic tiles never overlap and stay above inventory on narrow screens", async ({
  page,
}) => {
  await loginWithInventory(page);
  const tiles = page.locator('[id$="--demoGrid"] .sapMGT');
  await expect(tiles).toHaveCount(4);
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect
      .poll(async () =>
        tiles.evaluateAll((els) => {
          const boxes = els.map((el) => el.getBoundingClientRect());
          const grid = els[0]
            .closest(".sapFGridContainer")!
            .getBoundingClientRect();
          const inside = boxes.every(
            (b) =>
              b.left >= grid.left - 1 &&
              b.right <= grid.right + 1 &&
              b.bottom <= grid.bottom + 1,
          );
          const disjoint = boxes.every((a, i) =>
            boxes
              .slice(i + 1)
              .every(
                (b) =>
                  a.right <= b.left + 1 ||
                  b.right <= a.left + 1 ||
                  a.bottom <= b.top + 1 ||
                  b.bottom <= a.top + 1,
              ),
          );
          return inside && disjoint;
        }),
      )
      .toBe(true);
    const inventoryTitle = await page
      .getByRole("heading", { name: "Envanterin", exact: true })
      .boundingBox();
    const boxes = await tiles.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().bottom),
    );
    expect(Math.max(...boxes)).toBeLessThanOrEqual(inventoryTitle!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("item and location use native Object Page titles, sections and floating save footers", async ({
  page,
}) => {
  await loginWithInventory(page);
  await page
    .getByRole("button", { name: "Siemens EQ700", exact: true })
    .click();
  const objectPage = page.locator(".sapUxAPObjectPageLayout:visible");
  await expect(objectPage).toBeVisible();
  const describe = async () =>
    objectPage.evaluate(
      async (el) =>
        new Promise<any>((resolve, reject) =>
          (window as any).sap.ui.require(
            ["sap/ui/core/Element"],
            (Element: any) => {
              try {
                const control = Element.getElementById(el.id);
                resolve({
                  layout: control.getMetadata().getName(),
                  title: control.getHeaderTitle().getMetadata().getName(),
                  titlePlacement: control.getSubSectionLayout(),
                  anchors: control.getShowAnchorBar(),
                  sections: control
                    .getSections()
                    .filter((s: any) => s.getVisible())
                    .map((s: any) => s.getTitle()),
                  footer: control.getFooter().getMetadata().getName(),
                  showFooter: control.getShowFooter(),
                });
              } catch (error) {
                reject(error);
              }
            },
            reject,
          ),
        ),
    );
  await expect.poll(describe).toMatchObject({
    layout: "sap.uxap.ObjectPageLayout",
    title: "sap.uxap.ObjectPageDynamicHeaderTitle",
    titlePlacement: "TitleOnTop",
    anchors: true,
    sections: ["Genel Bilgiler", "Özel Alanlar", "Dosyalar", "Bakım"],
    footer: "sap.m.OverflowToolbar",
    showFooter: false,
  });
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(
    page
      .locator(".sapMPage:visible .sapUxAPObjectPageFloatingFooter")
      .getByRole("button", { name: "Kaydet", exact: true }),
  ).toBeInViewport();
  await expect.poll(describe).toMatchObject({
    showFooter: true,
    sections: ["Genel Bilgiler", "Özel Alanlar"],
  });
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await page.goto("/#locations/living");
  await expect(
    page
      .locator(".sapFDynamicPageTitle:visible")
      .getByRole("heading", { name: "Salon", exact: true }),
  ).toBeVisible();
  await expect.poll(describe).toMatchObject({
    layout: "sap.uxap.ObjectPageLayout",
    titlePlacement: "TitleOnTop",
    sections: ["Genel Bilgiler", "Hiyerarşi"],
    showFooter: false,
  });
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(
    page
      .locator(".sapMPage:visible .sapUxAPObjectPageFloatingFooter")
      .getByRole("button", { name: "Kaydet", exact: true }),
  ).toBeInViewport();
  await expect(page.getByLabel("Ad", { exact: true })).toBeInViewport();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
