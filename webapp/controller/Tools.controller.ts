import BaseController, { type UIEvent } from "./BaseController";
import MessageBox from "sap/m/MessageBox";
import type { Notifier } from "../service/HomeboxApi";
/** @namespace homebox.controller */
export default class ToolsController extends BaseController {
  private importFile?: File;
  public override onInit(): void {
    super.onInit();
    this.setViewModel({
      notifier: { name: "", url: "" },
      notifiers: [],
      notifierNote: "",
      fileName: "Dosya seçilmedi.",
      actions: [
        { id: "ensure-asset-ids", name: "Eksik varlık numaralarını ata" },
        {
          id: "ensure-import-refs",
          name: "İçe aktarma referanslarını tamamla",
        },
        { id: "set-primary-photos", name: "Ana fotoğrafları belirle" },
        {
          id: "create-missing-thumbnails",
          name: "Eksik küçük resimleri oluştur",
        },
        { id: "zero-item-time-fields", name: "Tarihlerden saat bilgisini sil" },
      ],
    });
    this.route(["tools"]);
  }
  protected override async onPageEntered(): Promise<void> {
    try {
      this.vm().setProperty(
        "/notifiers",
        (await this.app.api.notifiers()) || [],
      );
      this.vm().setProperty("/notifierNote", "");
    } catch (e) {
      if ((e as { status?: number }).status === 401) this.app.handleError(e);
      else
        this.vm().setProperty(
          "/notifierNote",
          "Bildirim listesi alınamadı. Sunucu sürümünü ve yetkilerinizi kontrol edin.",
        );
    }
  }
  public async onExport(): Promise<void> {
    await this.app.run(async () => {
      const blob = await this.app.api.exportCsv();
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "homebox-envanter.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  public onPickFile(event: UIEvent): void {
    this.importFile = (event.getParameter("files") as File[] | undefined)?.[0];
    this.vm().setProperty(
      "/fileName",
      this.importFile?.name || "Dosya seçilmedi.",
    );
  }
  public async onImport(): Promise<void> {
    await this.app.run(async () => {
      if (!this.importFile) throw new Error("Önce bir CSV dosyası seçin.");
      const result = await this.app.api.importCsv(this.importFile);
      this.importFile = undefined;
      this.vm().setProperty("/fileName", "Dosya seçilmedi.");
      this.app.flash(`${result?.completed ?? 0} kayıt içe aktarıldı.`);
      await this.app.refresh();
    });
  }
  public async onAddNotifier(): Promise<void> {
    await this.app.run(async () => {
      const f = this.vm().getProperty("/notifier") as {
        name: string;
        url: string;
      };
      if (!f.name.trim()) throw new Error("Lütfen bildirim adını girin.");
      await this.app.api.saveNotifier({ ...f, isActive: true });
      this.vm().setProperty("/notifier", { name: "", url: "" });
      await this.onPageEntered();
      this.app.flash("Bildirim eklendi.");
    });
  }
  public async onTestNotifier(): Promise<void> {
    await this.app.run(async () => {
      await this.app.api.testNotifier(
        this.vm().getProperty("/notifier/url") as string,
      );
      this.app.flash("Test bildirimi gönderildi.");
    });
  }
  public async onToggleNotifier(event: UIEvent): Promise<void> {
    const n = this.context<Notifier>(event, "view");
    await this.app.run(async () => {
      await this.app.api.saveNotifier(
        { name: n.name, isActive: n.isActive },
        n,
      );
      await this.onPageEntered();
    });
  }
  public onDeleteNotifier(event: UIEvent): void {
    const n = this.context<Notifier>(event, "view");
    this.confirm("Bildirim silinsin mi?", async () => {
      await this.app.api.deleteNotifier(n.id);
      await this.onPageEntered();
    });
  }
  public onRunAction(event: UIEvent): void {
    const action = this.context<{ id: string; name: string }>(event, "view");
    MessageBox.confirm(
      `“${action.name}” işlemi tüm koleksiyona uygulansın mı?`,
      {
        onClose: (choice) => {
          if (choice === "OK")
            void this.app.run(async () => {
              const r = await this.app.api.runAction(action.id);
              this.app.flash(`${r?.completed ?? 0} kayıt işlendi.`);
              await this.app.refresh();
            });
        },
      },
    );
  }
}
