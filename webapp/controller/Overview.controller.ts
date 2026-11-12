import InventoryController from "./Inventory.controller";
/** @namespace homebox.controller */
export default class OverviewController extends InventoryController {
  public override onInit(): void {
    super.onInit();
    this.route(["overview", "home"]);
  }
}
