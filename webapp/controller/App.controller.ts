import BaseController, { type UIEvent } from "./BaseController";
import type NavContainer from "sap/m/NavContainer";
import type View from "sap/ui/core/mvc/View";
import type NavigationListItem from "sap/tnt/NavigationListItem";
import { tabIds, type TabId } from "../model/AppModel";
import type Dialog from "sap/m/Dialog";
import type HTML from "sap/ui/core/HTML";
import BarcodeCamera, { cameraError } from "../service/BarcodeCamera";
import { resolveScan, type ScanMatch } from "../service/barcodes";
/** @namespace homebox.controller */
export default class AppController extends BaseController {
  private camera = new BarcodeCamera();
  private scannerDialog?: Dialog;
  private scanEpoch = 0;
  public async onOpenScanner(): Promise<void> {
    this.camera.stop();
    this.scanEpoch++;
    this.vm().setProperty("/scanCode", "");
    this.vm().setProperty("/scanMatches", []);
    this.vm().setProperty("/scanBusy", false);
    this.vm().setProperty("/scanCameraVisible", true);
    this.vm().setProperty("/scanMessage", "Kamera açılıyor…");
    this.vm().setProperty("/scanMessageType", "Information");
    this.scannerDialog = await this.openDialog("BarcodeScanner");
  }
  public async onScannerOpened(): Promise<void> {
    const epoch = ++this.scanEpoch;
    this.vm().setProperty("/scanCameraVisible", true);
    this.vm().setProperty("/scanMessage", "Kamera açılıyor…");
    this.vm().setProperty("/scanMessageType", "Information");
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (epoch !== this.scanEpoch) return;
    const dom = (this.byId("scanPreview") as HTML).getDomRef();
    const video = dom?.matches("video")
      ? (dom as HTMLVideoElement)
      : dom?.querySelector("video");
    if (!video) return;
    try {
      await this.camera.start(video, (text) => {
        if (epoch !== this.scanEpoch) return;
        this.vm().setProperty("/scanCode", text);
        void this.onLookupBarcode();
      });
      if (epoch === this.scanEpoch && !this.vm().getProperty("/scanBusy"))
        this.vm().setProperty(
          "/scanMessage",
          "Barkodu veya QR kodu kamera alanına getir.",
        );
    } catch (error) {
      if (epoch !== this.scanEpoch) return;
      this.vm().setProperty("/scanCameraVisible", false);
      this.vm().setProperty("/scanMessage", cameraError(error));
      this.vm().setProperty("/scanMessageType", "Warning");
    }
  }
  public onScannerClosing(): void {
    this.scanEpoch++;
    this.camera.stop();
  }
  public onScannerClosed(): void {
    this.vm().setProperty("/scanBusy", false);
  }
  public onCloseScanner(): void {
    this.scannerDialog?.close();
  }
  public async onLookupBarcode(): Promise<void> {
    if (this.vm().getProperty("/scanBusy")) return;
    const text = String(this.vm().getProperty("/scanCode") || "").trim();
    if (!text) return;
    this.camera.stop();
    const epoch = this.scanEpoch,
      tenant = this.app.state().tenant;
    this.vm().setProperty("/scanMatches", []);
    this.vm().setProperty("/scanBusy", true);
    this.vm().setProperty("/scanMessage", "Envanterde aranıyor…");
    this.vm().setProperty("/scanMessageType", "Information");
    try {
      const result = await resolveScan(this.app.api, text);
      if (
        epoch !== this.scanEpoch ||
        tenant !== this.app.state().tenant ||
        !this.app.state().user
      )
        return;
      if (result.matches.length === 1) this.openScanMatch(result.matches[0]);
      else if (result.matches.length > 1) {
        this.vm().setProperty("/scanMatches", result.matches);
        this.vm().setProperty("/scanCameraVisible", false);
        this.vm().setProperty(
          "/scanMessage",
          "Birden fazla kayıt eşleşti. Açmak istediğin kaydı seç.",
        );
      } else {
        this.scannerDialog?.close();
        this.app.update({
          search: result.query,
          page: 1,
          locationFilter: "",
          tagFilter: "",
          archived: true,
        });
        this.getRouter().navTo("inventory");
        await this.app.loadItems();
      }
    } catch (error) {
      if (epoch !== this.scanEpoch) return;
      this.app.handleError(error);
      this.vm().setProperty(
        "/scanMessage",
        error instanceof Error
          ? error.message
          : "Kod aranamadı. Tekrar deneyebilirsin.",
      );
      this.vm().setProperty("/scanMessageType", "Error");
    } finally {
      if (epoch === this.scanEpoch) this.vm().setProperty("/scanBusy", false);
    }
  }
  private openScanMatch(match: ScanMatch): void {
    this.scannerDialog?.close();
    if (this.app.state().isPhone) this.app.setProperty("/sideExpanded", false);
    this.getRouter().navTo(match.kind === "location" ? "location" : "item", {
      id: match.id,
    });
  }
  public onSelectScannedItem(event: UIEvent): void {
    this.openScanMatch(this.context<ScanMatch>(event, "view"));
  }
  public onProfile(): void {
    this.getRouter().navTo("users");
  }
  public onToggleNavigation(): void {
    this.app.update({
      isPhone: innerWidth < 768,
      sideExpanded: !this.app.state().sideExpanded,
    });
  }
  public onToggleTheme(): void {
    this.app.toggleTheme();
  }
  public async onRefresh(): Promise<void> {
    await this.app.refresh();
  }
  public async onNavigationSelect(event: UIEvent): Promise<void> {
    const key = (event.getParameter("item") as NavigationListItem).getKey();
    if (key === "logout") {
      await this.app.logout();
      return;
    }
    if (key === "create") {
      if (this.app.state().isPhone)
        this.app.setProperty("/sideExpanded", false);
      this.onAddItem();
      return;
    }
    if (!tabIds.includes(key as TabId)) return;
    this.app.update({
      search: "",
      page: 1,
      locationFilter: "",
      tagFilter: "",
      error: "",
    });
    if (this.app.state().isPhone) this.app.setProperty("/sideExpanded", false);
    this.getRouter().navTo(key);
    if (key === "overview" || key === "inventory") void this.app.loadItems();
  }
  public async onGroupChange(event: UIEvent): Promise<void> {
    const item = event.getParameter(
      "selectedItem",
    ) as import("sap/ui/core/Item").default;
    await this.app.changeGroup(item.getKey());
  }
  public onGlobalSearch(event: UIEvent): void {
    this.app.update({
      search: String(event.getParameter("query") || ""),
      page: 1,
      locationFilter: "",
      tagFilter: "",
    });
    this.getRouter().navTo("inventory");
    void this.app.loadItems();
  }
  private keyboard?: (event: KeyboardEvent) => void;
  public override onInit(): void {
    super.onInit();
    this.setViewModel({
      maintenanceLoaded: false,
      scanCode: "",
      scanMatches: [],
      scanBusy: false,
      scanCameraVisible: true,
      scanMessage: "",
      scanMessageType: "Information",
    });
    this.keyboard = (event) => {
      if (
        event.key === "Escape" &&
        (this.app.state().isPhone || innerWidth < 768)
      ) {
        this.app.setProperty("/sideExpanded", false);
        this.byId("menuButton")?.focus();
      }
      if (
        event.key === "/" &&
        this.app.state().user &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement)?.tagName,
        )
      ) {
        const current = (
          this.byId("pages") as NavContainer
        ).getCurrentPage() as View | undefined;
        const search = current?.byId?.("inventorySearch");
        if (search) {
          event.preventDefault();
          search.focus();
        }
      }
    };
    document.addEventListener("keydown", this.keyboard);
  }
  public override onExit(): void {
    this.camera.stop();
    if (this.keyboard) document.removeEventListener("keydown", this.keyboard);
    super.onExit();
  }
}
