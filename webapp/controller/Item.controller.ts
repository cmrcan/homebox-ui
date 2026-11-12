import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController, { type UIEvent } from "./BaseController";
import { ancestorCrumbs, type Crumb } from "../model/breadcrumbs";
/** @namespace homebox.controller */
export default class ItemController extends BaseController {
  private loadedKey = "";
  private generation = 0;
  public override onInit(): void {
    super.onInit();
    this.setViewModel({
      pageTitle: "Ürün",
      ready: false,
      loading: false,
      editing: false,
      crumbs: [],
      maintenanceLoaded: false,
    });
    this.getView()!.setModel(new JSONModel({ fields: [] }), "edit");
    this.route(["item", "itemNew"]);
  }
  protected override async onPageEntered(entered = false): Promise<void> {
    const state = this.app.state();
    const tenant = state.tenant;
    const id = state.routeName === "itemNew" ? "" : this.routeArguments.id;
    const key = `${state.tenant}:${id || "new"}`;
    if (
      !entered &&
      key === this.loadedKey &&
      (state.saving || this.vm().getProperty("/editing"))
    )
      return;
    const generation = ++this.generation;
    this.loadedKey = key;
    this.vm().setData({
      pageTitle: id ? "Ürün yükleniyor…" : "Ürün ekle",
      ready: false,
      loading: !!id,
      editing: !id,
      crumbs: [],
      maintenanceLoaded: false,
    });
    this.app.setProperty("/selected", null);
    if (id) {
      const item = await this.app.selectItem(id);
      if (
        generation !== this.generation ||
        tenant !== this.app.state().tenant ||
        !["item", "itemNew"].includes(this.app.state().routeName)
      )
        return;
      this.vm().setProperty("/loading", false);
      if (!item) {
        this.vm().setProperty("/pageTitle", "Ürün yüklenemedi");
        this.setCrumbs();
        this.loadedKey = "";
        return;
      }
      this.vm().setProperty("/pageTitle", item.name);
    } else await this.app.prepareItem();
    this.vm().setProperty("/ready", true);
    this.editModel().setData(this.app.state().form);
    this.setCrumbs();
  }
  private setCrumbs(): void {
    const item = this.app.state().selected;
    this.vm().setProperty("/crumbs", [
      { text: "Homebox", route: "overview" },
      { text: "Envanterim", route: "inventory" },
      ...(item ? ancestorCrumbs(item, this.app.state().locations) : []),
    ]);
  }
  public onCrumb(event: UIEvent): void {
    const crumb = this.context<Crumb>(event, "view");
    this.getRouter().navTo(crumb.route, crumb.id ? { id: crumb.id } : {});
  }
  public onBack(): void {
    this.getRouter().navTo("inventory");
  }
  public async onEditItem(): Promise<void> {
    await this.app.prepareItem(this.app.state().selected);
    this.editModel().setData(this.app.state().form);
    this.vm().setProperty("/editing", true);
  }
  public onCancelEdit(): void {
    if (!this.app.state().selected) {
      this.onBack();
      return;
    }
    this.app.setProperty("/error", "");
    this.vm().setProperty("/editing", false);
  }
  public async onSaveItem(): Promise<void> {
    this.app.setProperty("/form", this.editModel().getData());
    const selected = await this.app.saveItem();
    if (!selected) return;
    this.vm().setProperty("/editing", false);
    this.vm().setProperty("/pageTitle", selected.name);
    this.setCrumbs();
    if (this.app.state().routeName === "itemNew")
      this.getRouter().navTo("item", { id: selected.id }, true);
  }
  public onDeleteItem(): void {
    const item = this.app.state().selected;
    if (!item) return;
    this.confirm(`“${item.name}” silinsin mi?`, async () => {
      if (await this.app.removeItem()) this.onBack();
    });
  }
}
