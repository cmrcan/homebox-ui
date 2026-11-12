import BaseController from "./BaseController";
/** @namespace homebox.controller */
export default class OrganizersController extends BaseController {
  public override onInit(): void {
    super.onInit();
    this.setViewModel({ organizers: [] });
    this.route(["locations", "tags"]);
  }
  protected override onPageEntered(): void {
    this.vm().setProperty(
      "/organizers",
      this.app.state().tab === "locations"
        ? this.app.state().locations
        : this.app.state().tags,
    );
  }
  public onOpenOrganizer(): void {
    void this.onAddOrganizer();
  }
}
