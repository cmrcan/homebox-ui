import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";
import AppModel, { tabIds, titles, type TabId } from "./model/AppModel";
/** @namespace homebox */
export default class Component extends UIComponent {
  static metadata = {
    manifest: "json",
    interfaces: ["sap.ui.core.IAsyncContentCreation"],
  };
  public init(): void {
    super.init();
    const app = new AppModel(
      this.getManifestEntry("/sap.app/dataSources/homebox/uri") as string,
    );
    this.setModel(app);
    this.setModel(new JSONModel(Device), "device");
    const router = this.getRouter();
    router.attachBeforeRouteMatched((event) => {
      const name = event.getParameter("name");
      const tab = (name === "home" ? "overview" : name) as TabId;
      if (tabIds.includes(tab)) app.update({ tab, title: titles[tab] });
    });
    app.attachEvent("sessionChanged", () => {
      if (app.state().user) router.parse(location.hash.slice(1));
    });
    this.resize = ({ width }: { width: number; height: number }) => {
      const phone = width < 768;
      app.setProperty("/isPhone", phone);
      if (phone) app.setProperty("/sideExpanded", false);
    };
    Device.resize.attachHandler(this.resize);
    router.initialize();
    void app.restoreSession();
  }
  private resize?: (event: { width: number; height: number }) => void;
  public destroy(): void {
    if (this.resize) Device.resize.detachHandler(this.resize);
    super.destroy();
  }
}
