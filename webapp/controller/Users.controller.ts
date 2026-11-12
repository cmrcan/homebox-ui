import BaseController, { type UIEvent } from "./BaseController";
import type { Member } from "../service/HomeboxApi";
/** @namespace homebox.controller */
export default class UsersController extends BaseController {
  public override onInit(): void {
    super.onInit();
    this.setViewModel({
      profile: { name: "", email: "" },
      password: { current: "", next: "", again: "" },
      group: { name: "", currency: "TRY" },
      invite: { uses: 1, days: 7 },
      token: "",
      members: [],
      membersNote: "",
      deleteText: "",
    });
    this.route(["users"]);
  }
  protected override async onPageEntered(): Promise<void> {
    const s = this.app.state();
    this.vm().setProperty("/profile", { ...s.user });
    this.vm().setProperty("/group", {
      name: s.groupName,
      currency: s.currency,
    });
    await this.loadMembers();
  }
  private async loadMembers(): Promise<void> {
    try {
      this.vm().setProperty("/members", (await this.app.api.members()) || []);
      this.vm().setProperty("/membersNote", "");
    } catch (e) {
      if ((e as { status?: number }).status === 401) this.app.handleError(e);
      else
        this.vm().setProperty(
          "/membersNote",
          "Üye listesi alınamadı. Sunucu sürümünü ve yetkilerinizi kontrol edin.",
        );
    }
  }
  public async onSaveProfile(): Promise<void> {
    await this.app.run(async () => {
      const profile = this.vm().getProperty("/profile") as {
        name: string;
        email: string;
      };
      this.app.setProperty("/user", await this.app.api.updateSelf(profile));
      this.app.flash("Profil güncellendi.");
    });
  }
  public async onChangePassword(): Promise<void> {
    await this.app.run(async () => {
      const f = this.vm().getProperty("/password") as {
        current: string;
        next: string;
        again: string;
      };
      if (!f.next) throw new Error("Yeni şifreyi girin.");
      if (f.next !== f.again) throw new Error("Yeni şifreler eşleşmiyor.");
      await this.app.api.changePassword(f.current, f.next);
      this.vm().setProperty("/password", { current: "", next: "", again: "" });
      this.app.flash("Şifre değiştirildi.");
    });
  }
  public async onSaveGroup(): Promise<void> {
    await this.app.run(async () => {
      const body = this.vm().getProperty("/group") as {
        name: string;
        currency: string;
      };
      const saved = await this.app.api.updateGroup(body);
      this.app.update({
        groups: this.app
          .state()
          .groups.map((g) =>
            g.id === this.app.state().tenant ? { ...g, ...saved } : g,
          ),
        currency: body.currency,
        groupName: body.name,
      });
      this.app.flash("Koleksiyon güncellendi.");
    });
  }
  public async onInvite(): Promise<void> {
    await this.app.run(async () => {
      const f = this.vm().getProperty("/invite") as {
        uses: number;
        days: number;
      };
      const result = await this.app.api.invite(
        Number(f.uses),
        new Date(Date.now() + Number(f.days) * 86400000).toISOString(),
      );
      this.vm().setProperty("/token", result.token);
    });
  }
  public async onCopyToken(): Promise<void> {
    await this.app.run(async () => {
      await navigator.clipboard.writeText(
        this.vm().getProperty("/token") as string,
      );
      this.app.flash("Davet kodu kopyalandı.");
    });
  }
  public onRemoveMember(event: UIEvent): void {
    const m = this.context<Member>(event, "view");
    this.confirm("Üye koleksiyondan çıkarılsın mı?", async () => {
      await this.app.api.removeMember(m.id);
      await this.loadMembers();
    });
  }
  public onDeleteAccount(): void {
    if (this.vm().getProperty("/deleteText") !== "SİL") {
      this.app.setProperty("/error", "Onay için SİL yazın.");
      return;
    }
    this.confirm("Hesabınız kalıcı olarak silinsin mi?", async () => {
      await this.app.api.deleteSelf();
      await this.app.logout();
    });
  }
}
