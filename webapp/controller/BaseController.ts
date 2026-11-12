import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Router from "sap/ui/core/routing/Router";
import type UIComponent from "sap/ui/core/UIComponent";
import type Dialog from "sap/m/Dialog";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import MessageBox from "sap/m/MessageBox";
import AppModel from "../model/AppModel";
import formatter from "../model/formatter";
import { blankField, mergeTemplateFields } from "../model/fields";
import type {
  Item,
  Maintenance,
  Organizer,
  CustomField,
} from "../service/HomeboxApi";
export type UIEvent = Event<Record<string, unknown>>;
/** @namespace homebox.controller */
export default class BaseController extends Controller {
  public formatter = formatter;
  protected app!: AppModel;
  private initialViewData: object = {};
  private dialogs = new Map<string, Promise<Dialog>>();
  private activeDialog?: Dialog;
  private closePromise?: Promise<void>;
  private routeNames: string[] = [];
  private listeners: {
    route: ReturnType<Router["getRoute"]>;
    callback: () => void;
  }[] = [];
  public onInit(): void {
    this.app = this.getOwnerComponent()!.getModel() as AppModel;
    this.app.attachEvent("closeDialogs", this.closeDialogs, this);
    this.app.attachEvent("sessionChanged", this.sessionChanged, this);
    this.app.attachEvent("contextChanged", this.contextChanged, this);
  }
  public onExit(): void {
    this.app.detachEvent("closeDialogs", this.closeDialogs, this);
    this.app.detachEvent("sessionChanged", this.sessionChanged, this);
    this.app.detachEvent("contextChanged", this.contextChanged, this);
    for (const x of this.listeners) x.route?.detachPatternMatched(x.callback);
  }
  protected getRouter(): Router {
    return (this.getOwnerComponent() as UIComponent).getRouter();
  }
  protected setViewModel(data: object) {
    this.initialViewData = JSON.parse(JSON.stringify(data)) as object;
    this.getView()!.setModel(new JSONModel(data), "view");
  }
  protected vm(): JSONModel {
    return this.getView()!.getModel("view") as JSONModel;
  }
  protected editModel(): JSONModel {
    return this.getView()!.getModel("edit") as JSONModel;
  }
  protected context<T>(event: UIEvent, model?: string): T {
    return (event.getSource() as Control)
      .getBindingContext(model)!
      .getObject() as T;
  }
  protected route(names: string[]) {
    this.routeNames = names;
    for (const name of names) {
      const route = this.getRouter().getRoute(name);
      if (!route) continue;
      const callback = () => {
        if (this.app.state().user) void this.onPageEntered();
      };
      route.attachPatternMatched(callback);
      this.listeners.push({ route, callback });
    }
  }
  protected onPageEntered(): void | Promise<void> {}
  private contextChanged() {
    if (
      this.routeNames.includes(this.app.state().tab) ||
      (this.app.state().tab === "overview" && this.routeNames.includes("home"))
    )
      void this.onPageEntered();
  }
  private sessionChanged() {
    if (!this.app.state().user) {
      this.closeDialogs();
      const vm = this.getView()?.getModel("view") as JSONModel | undefined;
      const email = vm?.getProperty("/email");
      vm?.setData(JSON.parse(JSON.stringify(this.initialViewData)));
      if (this.getView()?.getViewName() === "homebox.view.Login" && email)
        vm?.setProperty("/email", email);
      (this.getView()?.getModel("edit") as JSONModel | undefined)?.setData({
        fields: [],
      });
    }
  }

  private closeDialogs() {
    for (const p of this.dialogs.values()) void p.then((d) => d.close());
    this.activeDialog = undefined;
  }
  protected async openDialog(name: string): Promise<Dialog> {
    if (!this.dialogs.has(name))
      this.dialogs.set(
        name,
        this.loadFragment({
          name: `homebox.fragment.${name}`,
        }) as Promise<Dialog>,
      );
    const d = await this.dialogs.get(name)!;
    if (
      this.activeDialog &&
      this.activeDialog !== d &&
      this.activeDialog.isOpen()
    ) {
      const old = this.activeDialog;
      this.closePromise = new Promise<void>((resolve) => {
        old.attachEventOnce("afterClose", () => resolve());
        old.close();
      });
    }
    if (this.closePromise) {
      await this.closePromise;
      this.closePromise = undefined;
    }
    this.activeDialog = d;
    d.open();
    return d;
  }
  public onCloseDialog(): void {
    this.activeDialog?.close();
  }
  public async onAddItem(): Promise<void> {
    await this.app.prepareItem();
    this.getView()!.setModel(new JSONModel(this.app.state().form), "edit");
    await this.openDialog("ItemEdit");
  }
  public async onOpenItem(event: UIEvent): Promise<void> {
    const item = this.context<Item>(event);
    if (await this.app.selectItem(item.id)) {
      this.vm().setProperty("/maintenanceLoaded", false);
      await this.openDialog("ItemDetail");
    }
  }
  public async onEditItem(): Promise<void> {
    await this.app.prepareItem(this.app.state().selected);
    this.getView()!.setModel(new JSONModel(this.app.state().form), "edit");
    await this.openDialog("ItemEdit");
  }
  public async onSaveItem(): Promise<void> {
    this.app.setProperty("/form", this.editModel().getData());
    if (await this.app.saveItem()) await this.openDialog("ItemDetail");
  }
  public onDeleteItem(): void {
    const item = this.app.state().selected;
    if (!item) return;
    this.confirm(`“${item.name}” silinsin mi?`, async () => {
      if (await this.app.removeItem()) this.onCloseDialog();
    });
  }
  protected confirm(message: string, task: () => Promise<void>) {
    MessageBox.confirm(message, {
      actions: ["Evet, sil", "Vazgeç"],
      emphasizedAction: "Vazgeç",
      onClose: (action) => {
        if (action === "Evet, sil") void this.app.run(task);
      },
    });
  }
  public async onUpload(event: UIEvent): Promise<void> {
    const file = (event.getParameter("files") as File[] | undefined)?.[0];
    if (file) await this.app.upload(file);
    (
      event.getSource() as import("sap/ui/unified/FileUploader").default
    ).setValue("");
  }
  public onPrintLabel(): void {
    const item = this.app.state().selected;
    if (item) window.open(this.app.api.labelUrl(item.id), "_blank", "noopener");
  }
  public onAddField(): void {
    const model = this.editModel();
    model.setProperty("/fields", [
      ...((model.getProperty("/fields") as CustomField[]) || []),
      blankField(),
    ]);
  }
  public onRemoveField(event: UIEvent): void {
    const path = (event.getSource() as Control)
      .getBindingContext("edit")!
      .getPath();
    const index = Number(path.split("/").at(-1));
    const fields = this.editModel().getProperty("/fields") as CustomField[];
    this.editModel().setProperty(
      "/fields",
      fields.filter((_f, i) => i !== index),
    );
  }
  public async onTypeChange(): Promise<void> {
    this.app.setProperty("/form", this.editModel().getData());
    await this.app.applyTypeTemplate();
    this.editModel().setProperty("/fields", this.app.state().form.fields);
  }
  public async onPickTemplate(): Promise<void> {
    await this.app.run(async () => {
      const templates = await this.app.api.templates();
      this.vm().setProperty("/templates", templates);
      this.vm().setProperty("/templateChoice", templates[0]?.id || "");
      await this.openDialog("TemplatePicker");
    });
  }
  public async onUseTemplate(): Promise<void> {
    await this.app.run(async () => {
      const id = this.vm().getProperty("/templateChoice") as string;
      if (!id) throw new Error("Önce bir şablon seçin.");
      const template = await this.app.api.template(id);
      this.editModel().setProperty(
        "/fields",
        mergeTemplateFields(
          this.editModel().getProperty("/fields"),
          template.fields || [],
        ),
      );
      await this.openDialog("ItemEdit");
    });
  }
  public onCancelTemplatePicker(): void {
    void this.openDialog("ItemEdit");
  }
  public async onAddOrganizer(): Promise<void> {
    this.app.prepareOrganizer(
      this.app.state().tab === "locations" ? "locations" : "tags",
    );
    await this.openDialog("OrganizerEdit");
  }
  public async onEditOrganizer(event: UIEvent): Promise<void> {
    this.app.prepareOrganizer(
      this.app.state().tab === "locations" ? "locations" : "tags",
      this.context<Organizer>(event, "view"),
    );
    await this.openDialog("OrganizerEdit");
  }
  public async onSaveOrganizer(): Promise<void> {
    if (await this.app.saveOrganizer()) this.onCloseDialog();
  }
  public onViewOrganizer(event: UIEvent): void {
    const item = this.context<Organizer>(event, "view");
    this.app.update({
      search: "",
      page: 1,
      locationFilter: this.app.state().tab === "locations" ? item.id : "",
      tagFilter: this.app.state().tab === "tags" ? item.id : "",
    });
    this.getRouter().navTo("inventory");
    void this.app.loadItems();
  }
  public async onLoadItemMaintenance(): Promise<void> {
    await this.app.run(async () => {
      const selected = this.app.state().selected;
      if (!selected) return;
      this.vm().setProperty(
        "/itemMaintenance",
        (await this.app.api.itemMaintenance(selected.id)) || [],
      );
      this.vm().setProperty("/maintenanceForm", {
        name: "",
        description: "",
        cost: 0,
        scheduledDate: "",
      });
      this.vm().setProperty("/maintenanceLoaded", true);
    });
  }
  public async onAddMaintenance(): Promise<void> {
    await this.app.run(async () => {
      const item = this.app.state().selected;
      if (!item) return;
      const f = this.vm().getProperty("/maintenanceForm") as {
        name: string;
        description: string;
        cost: number;
        scheduledDate: string;
      };
      if (!f.name.trim()) throw new Error("Lütfen bakım adını girin.");
      await this.app.api.addMaintenance(item.id, {
        ...f,
        cost: String(f.cost || 0),
        scheduledDate: f.scheduledDate || "0001-01-01",
        completedDate: "0001-01-01",
      });
      await this.onLoadItemMaintenance();
    });
  }
  private async reloadMaintenance(path: string) {
    if (path.startsWith("/itemMaintenance")) await this.onLoadItemMaintenance();
    else await this.onPageEntered();
  }
  public async onCompleteMaintenance(event: UIEvent): Promise<void> {
    const entry = this.context<Maintenance>(event, "view");
    const path = (event.getSource() as Control)
      .getBindingContext("view")!
      .getPath();
    await this.app.run(async () => {
      await this.app.api.saveMaintenance(entry.id, {
        name: entry.name,
        description: entry.description || "",
        cost: String(entry.cost || 0),
        scheduledDate: entry.scheduledDate || "0001-01-01",
        completedDate: new Date().toISOString().slice(0, 10),
      });
      await this.reloadMaintenance(path);
    });
  }
  public onDeleteMaintenance(event: UIEvent): void {
    const entry = this.context<Maintenance>(event, "view");
    const path = (event.getSource() as Control)
      .getBindingContext("view")!
      .getPath();
    this.confirm("Bakım kaydı silinsin mi?", async () => {
      await this.app.api.deleteMaintenance(entry.id);
      await this.reloadMaintenance(path);
    });
  }
}
