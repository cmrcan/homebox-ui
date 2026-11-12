import BaseController, { type UIEvent } from "./BaseController";
/** @namespace homebox.controller */
export default class InventoryController extends BaseController {
  public override onInit(): void {
    super.onInit();
    this.setViewModel({ maintenanceLoaded: false });
    this.route(["inventory"]);
  }
  public onSearch(event: UIEvent): void {
    this.app.setProperty(
      "/search",
      String(
        event.getParameter("newValue") ?? event.getParameter("query") ?? "",
      ),
    );
    this.app.filter();
  }
  public onFilter(): void {
    this.app.filter();
  }
  public onGrid(): void {
    this.app.setProperty("/view", "grid");
  }
  public onList(): void {
    this.app.setProperty("/view", "list");
  }
  public onPrevious(): void {
    if (this.app.state().page > 1) {
      this.app.setProperty("/page", this.app.state().page - 1);
      void this.app.loadItems();
    }
  }
  public onNext(): void {
    const s = this.app.state();
    if (s.page * 12 < s.result.total) {
      this.app.setProperty("/page", s.page + 1);
      void this.app.loadItems();
    }
  }
}
