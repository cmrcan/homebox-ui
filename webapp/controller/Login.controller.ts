import BaseController from "./BaseController";
/** @namespace homebox.controller */
export default class LoginController extends BaseController {
  public override onInit(): void {
    super.onInit();
    this.setViewModel({
      email: "",
      password: "",
      showPassword: false,
      register: { name: "", email: "", password: "", token: "" },
    });
  }
  public onTogglePassword(): void {
    this.vm().setProperty(
      "/showPassword",
      !this.vm().getProperty("/showPassword"),
    );
  }
  public async onLogin(): Promise<void> {
    const { email, password } = this.vm().getData() as {
      email: string;
      password: string;
    };
    if (!email.trim() || !password) {
      this.app.setProperty("/error", "E-posta ve şifrenizi girin.");
      return;
    }
    if (await this.app.login(email, password))
      this.vm().setProperty("/password", "");
  }
  public onRegister(): void {
    this.app.setProperty("/error", "");
    void this.openDialog("Registration");
  }
  public async onSaveRegistration(): Promise<void> {
    await this.app.run(async () => {
      const f = this.vm().getProperty("/register") as {
        name: string;
        email: string;
        password: string;
        token: string;
      };
      await this.app.api.register(f);
      this.vm().setProperty("/email", f.email);
      this.vm().setProperty("/register", {
        name: "",
        email: "",
        password: "",
        token: "",
      });
      this.onCloseDialog();
      this.app.flash("Hesap oluşturuldu. Şimdi giriş yapabilirsiniz.");
    });
  }
}
