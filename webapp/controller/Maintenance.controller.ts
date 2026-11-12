import BaseController from "./BaseController";
/** @namespace homebox.controller */
export default class MaintenanceController extends BaseController {
  public override onInit(): void {
    super.onInit();
    this.setViewModel({ status: "scheduled", maintenance: [] });
    this.route(["maintenance"]);
  }
  protected override async onPageEntered(): Promise<void> {
    await this.app.run(async () => {
      this.vm().setProperty(
        "/maintenance",
        (await this.app.api.maintenanceList(
          this.vm().getProperty("/status"),
        )) || [],
      );
    });
  }
  public onStatusChange(): void {
    void this.onPageEntered();
  }
}
