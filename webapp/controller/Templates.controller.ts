import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController, { type UIEvent } from "./BaseController";
import type { Template } from "../service/HomeboxApi";
import { copyFields, cleanFields } from "../model/fields";
/** @namespace homebox.controller */
export default class TemplatesController extends BaseController {
  private existing?: Template;
  public override onInit(): void {
    super.onInit();
    this.setViewModel({ templates: [] });
    this.route(["templates"]);
  }
  protected override async onPageEntered(): Promise<void> {
    await this.app.run(async () => {
      this.vm().setProperty(
        "/templates",
        (await this.app.api.templates()) || [],
      );
    });
  }
  private async open(existing?: Template): Promise<void> {
    this.existing = existing;
    this.getView()!.setModel(
      new JSONModel({
        name: existing?.name || "",
        description: existing?.description || "",
        defaultName: existing?.defaultName || "",
        defaultManufacturer: existing?.defaultManufacturer || "",
        defaultModelNumber: existing?.defaultModelNumber || "",
        defaultQuantity: existing?.defaultQuantity ?? 1,
        fields: copyFields(existing?.fields),
      }),
      "edit",
    );
    await this.openDialog("TemplateEdit");
  }
  public onNew(): void {
    void this.open();
  }
  public async onEdit(event: UIEvent): Promise<void> {
    const t = this.context<Template>(event, "view");
    await this.app.run(async () =>
      this.open(await this.app.api.template(t.id)),
    );
  }
  public async onSave(): Promise<void> {
    await this.app.run(async () => {
      const f = this.editModel().getData() as Template;
      if (!f.name.trim()) throw new Error("Lütfen şablon adını girin.");
      await this.app.api.templateSave(
        {
          ...f,
          defaultQuantity: Number(f.defaultQuantity),
          fields: cleanFields(f.fields || []),
        },
        this.existing,
      );
      this.onCloseDialog();
      await this.onPageEntered();
      this.app.flash("Şablon kaydedildi.");
    });
  }
  public onDelete(event: UIEvent): void {
    const t = this.context<Template>(event, "view");
    this.confirm(`“${t.name}” şablonu silinsin mi?`, async () => {
      await this.app.api.templateDelete(t.id);
      await this.onPageEntered();
    });
  }
}
