import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController, { type UIEvent } from "./BaseController";
import type { EntityType } from "../service/HomeboxApi";
/** @namespace homebox.controller */
export default class TypesController extends BaseController {
  private existing?: EntityType;
  public override onInit(): void {
    super.onInit();
    this.setViewModel({ types: [], templates: [] });
    this.route(["types"]);
  }
  protected override async onPageEntered(): Promise<void> {
    await this.app.run(async () => {
      const templates =
        this.app.state().mode === "entities"
          ? await this.app.api.templates()
          : [];
      this.vm().setProperty("/templates", [
        { id: "", name: "Şablon yok" },
        ...templates,
      ]);
      this.vm().setProperty(
        "/types",
        this.app.state().types.map((t) => ({
          ...t,
          templateId: this.app.typeTemplate(t.id),
        })),
      );
    });
  }
  public async onNew(): Promise<void> {
    this.existing = undefined;
    this.getView()!.setModel(
      new JSONModel({ name: "", description: "", isLocation: false }),
      "edit",
    );
    await this.openDialog("TypeEdit");
  }
  public async onEdit(event: UIEvent): Promise<void> {
    const { templateId: _templateId, ...type } = this.context<
      EntityType & { templateId?: string }
    >(event, "view");
    this.existing = type;
    this.getView()!.setModel(
      new JSONModel({
        name: this.existing.name,
        description: this.existing.description || "",
        isLocation: this.existing.isLocation,
      }),
      "edit",
    );
    await this.openDialog("TypeEdit");
  }
  public async onSave(): Promise<void> {
    await this.app.run(async () => {
      const f = this.editModel().getData() as { name: string };
      if (!f.name.trim()) throw new Error("Lütfen tür adını girin.");
      await this.app.api.typeSave(f, this.existing);
      const types = await this.app.api.types();
      this.app.update({
        types,
        itemTypes: types.filter((t) => !t.isLocation),
        locationTypes: types.filter((t) => t.isLocation),
      });
      this.onCloseDialog();
      await this.onPageEntered();
      this.app.flash("Ürün türü kaydedildi.");
    });
  }
  public onDelete(event: UIEvent): void {
    const t = this.context<EntityType>(event, "view");
    this.confirm(`“${t.name}” türü silinsin mi?`, async () => {
      await this.app.api.typeDelete(t.id);
      this.app.setTypeTemplate(t.id, "");
      const types = await this.app.api.types();
      this.app.update({
        types,
        itemTypes: types.filter((t) => !t.isLocation),
        locationTypes: types.filter((t) => t.isLocation),
      });
      await this.onPageEntered();
    });
  }
  public onTemplateChange(event: UIEvent): void {
    const type = this.context<EntityType & { templateId: string }>(
      event,
      "view",
    );
    this.app.setTypeTemplate(type.id, type.templateId);
    this.app.flash("Varsayılan alan şablonu kaydedildi.");
  }
}
