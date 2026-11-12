import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BarcodeFormat, QRCodeWriter } from "@zxing/library";
import { loginWithInventory } from "./homebox-fixture";
async function fakeCamera(page: Page, code?: string, denyFirst = false) {
  const matrix = code
    ? new QRCodeWriter().encode(code, BarcodeFormat.QR_CODE, 64, 64, new Map())
    : undefined;
  const bits = matrix
    ? Array.from({ length: 64 }, (_, y) =>
        Array.from({ length: 64 }, (_, x) => matrix.get(x, y)),
      )
    : [];
  await page.addInitScript(
    ({ bits, denyFirst }) => {
      (window as any).__scanStreams = [];
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          if (denyFirst && !(window as any).__cameraPermissionDeniedOnce) {
            (window as any).__cameraPermissionDeniedOnce = true;
            throw new DOMException("Denied", "NotAllowedError");
          }
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 320;
          const context = canvas.getContext("2d")!;
          const draw = () => {
            context.fillStyle = "#fff";
            context.fillRect(0, 0, 320, 320);
            context.fillStyle = "#000";
            bits.forEach((row, y) =>
              row.forEach((dark, x) => {
                if (dark) context.fillRect(x * 5, y * 5, 5, 5);
              }),
            );
          };
          draw();
          const stream = canvas.captureStream(10);
          const timer = setInterval(draw, 100);
          stream.getTracks().forEach((track) => {
            const stop = track.stop.bind(track);
            track.stop = () => {
              clearInterval(timer);
              stop();
            };
          });
          (window as any).__scanStreams.push(stream);
          return stream;
        },
      });
    },
    { bits, denyFirst },
  );
}
test("mobile header has a visible scanner action on phones and tablets", async ({
  page,
}) => {
  await loginWithInventory(page);
  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole("button", { name: "Barkod oku", exact: true }),
    ).toBeInViewport();
  }
});
test("camera decodes a real QR frame, opens the matching item and releases video tracks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeCamera(page, "SCAN-SERIAL-1");
  const policy = readFileSync("deploy/default.conf.template", "utf8").match(
    /Content-Security-Policy "([^"]+)"/,
  )![1];
  await page.route("http://127.0.0.1:5173/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "content-security-policy": policy },
    });
  });
  await loginWithInventory(page);
  await page.getByRole("button", { name: "Barkod oku", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Siemens EQ700", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__scanStreams.length > 0 &&
          (window as any).__scanStreams.every((s: MediaStream) =>
            s.getTracks().every((t) => t.readyState === "ended"),
          ),
      ),
    )
    .toBe(true);
});
test("closing the scanner stops an active camera without navigating", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await fakeCamera(page);
  await loginWithInventory(page);
  await page.getByRole("button", { name: "Barkod oku", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__scanStreams.length))
    .toBe(1);
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__scanStreams.every((s: MediaStream) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  await expect(page).toHaveURL(/#\/?inventory$/);
});
test("denied camera permission offers manual lookup", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    }),
  );
  await loginWithInventory(page);
  await page.getByRole("button", { name: "Barkod oku", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Kamera izni verilmedi");
  await page
    .getByLabel("Barkod / seri numarası", { exact: true })
    .fill("SCAN-SERIAL-1");
  await page
    .getByRole("button", { name: "Envanterde bul", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Siemens EQ700", exact: true }),
  ).toBeVisible();
});

test("multiple records with the same barcode offer an explicit choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    }),
  );
  await loginWithInventory(page);
  await page.route("**/api/v1/entities?*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.searchParams.has("fields") &&
      url.searchParams.get("isLocation") !== "true"
    )
      await route.fulfill({
        json: {
          items: [
            { id: "coffee", name: "Siemens EQ700", parent: { name: "Mutfak" } },
            { id: "lock", name: "Yale Linus L2", parent: { name: "Salon" } },
          ],
          total: 2,
        },
      });
    else await route.fallback();
  });
  await page.getByRole("button", { name: "Barkod oku", exact: true }).click();
  await page
    .getByLabel("Barkod / seri numarası", { exact: true })
    .fill("8691234567890");
  await page
    .getByRole("button", { name: "Envanterde bul", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Birden fazla kayıt eşleşti");
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "Yale Linus L2" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Yale Linus L2", exact: true }),
  ).toBeVisible();
});

test("a camera can be retried after an initial permission denial", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeCamera(page, "SCAN-SERIAL-1", true);
  await loginWithInventory(page);
  await page.getByRole("button", { name: "Barkod oku", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Kamera izni verilmedi");
  await page
    .getByRole("button", { name: "Kamerayı yeniden aç", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Siemens EQ700", exact: true }),
  ).toBeVisible({ timeout: 15000 });
});
