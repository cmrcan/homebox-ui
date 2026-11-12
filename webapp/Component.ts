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
      const parent = name?.startsWith("item")
        ? "inventory"
        : name?.startsWith("location")
          ? "locations"
          : name?.startsWith("tag")
            ? "tags"
            : name;
      const tab = (name === "home" ? "overview" : parent) as TabId;
      app.setProperty("/routeName", name);
      if (tabIds.includes(tab)) app.update({ tab, title: titles[tab] });
    });
    app.attachEvent("sessionChanged", () => {
      if (app.state().user) router.parse(location.hash.slice(1));
    });
    this.resize = () => {
      // Device resize notifications are delayed. Read the current viewport and
      // collapse only when entering phone layout; preserve a menu the user just opened.
      const phone = innerWidth < 768;
      const wasPhone = app.state().isPhone;
      app.setProperty("/isPhone", phone);
      app.setProperty(
        "/isMobile",
        innerWidth < 1024 || Device.system.phone || Device.system.tablet,
      );
      if (phone && !wasPhone) app.setProperty("/sideExpanded", false);
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
