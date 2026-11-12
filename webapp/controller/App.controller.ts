import BaseController, { type UIEvent } from "./BaseController";
import type NavContainer from "sap/m/NavContainer";
import type View from "sap/ui/core/mvc/View";
import type NavigationListItem from "sap/tnt/NavigationListItem";
import { tabIds, type TabId } from "../model/AppModel";
/** @namespace homebox.controller */
export default class AppController extends BaseController {
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
      await this.onAddItem();
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
    this.setViewModel({ maintenanceLoaded: false });
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
    if (this.keyboard) document.removeEventListener("keydown", this.keyboard);
    super.onExit();
  }
}
