import type Control from "sap/ui/core/Control";
import type Dialog from "sap/m/Dialog";
import { watch } from "@vue/reactivity";
import { U } from "./runtime";
import {
  button,
  errorStrip,
  field,
  input,
  panel,
  row,
  select,
  setAppModel,
  stack,
  text,
  title,
} from "./shared";
import {
  inventory,
  itemDetail,
  itemEditor,
  organizerEditor,
  overview,
} from "./inventory";
import * as management from "./management";
import {
  api,
  changeGroup,
  close,
  currentGroup,
  edit,
  flash,
  guarded,
  handleError,
  login,
  loginForm,
  logout,
  navigate,
  openOrganizer,
  refresh,
  restoreSession,
  s,
  tabIds,
  type TabId,
} from "../store";
import logo from "../assets/homebox-logo.svg?url";

const sections: {
  id: TabId;
  name: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "overview",
    name: "Genel bakış",
    icon: "home",
    description: "Evine ve eşyalarına dair her şey, bir arada.",
  },
  {
    id: "inventory",
    name: "Envanterim",
    icon: "product",
    description: "Eşyalarını bul, bilgilerini güncelle, düzenini koru.",
  },
  {
    id: "locations",
    name: "Konumlar",
    icon: "map",
    description: "Odalar, dolaplar ve saklama alanların.",
  },
  {
    id: "tags",
    name: "Etiketler",
    icon: "tag",
    description: "Eşyalarını senin için anlamlı gruplarda topla.",
  },
  {
    id: "types",
    name: "Ürün türleri",
    icon: "org-chart",
    description: "Ürün ve konum türlerini yönet.",
  },
  {
    id: "templates",
    name: "Alan şablonları",
    icon: "document-text",
    description: "Ortak alanlarını bir kez tanımla, her üründe kullan.",
  },
  {
    id: "maintenance",
    name: "Bakım",
    icon: "wrench",
    description: "Planlı ve tamamlanmış bakımların.",
  },
  {
    id: "users",
    name: "Kullanıcılar",
    icon: "group",
    description: "Hesabını, koleksiyonunu ve üyelerini yönet.",
  },
  {
    id: "tools",
    name: "Araçlar",
    icon: "action-settings",
    description: "İçe ve dışa aktarma, bildirimler ve bakım araçları.",
  },
];
let root: Control;
let pageHost: InstanceType<typeof U.VBox>;
let activeDialog: Dialog | null = null;
let menuDialog: Dialog | null = null;
let mountedTab = "";
function theme() {
  U.Theming.setTheme(s.dark ? "sap_horizon_dark" : "sap_horizon");
  document.documentElement.dataset.theme = s.dark ? "dark" : "light";
}
function navigation(mobile = false) {
  const nav = stack(
    ...sections.map((entry) => {
      const b = button(
        entry.name,
        () => {
          menuDialog?.close();
          navigate(entry.id);
        },
        entry.icon,
      ).setWidth("100%");
      b.bindProperty("type", {
        path: "/tab",
        formatter: (v: string) =>
          v === entry.id ? "Emphasized" : "Transparent",
      });
      return b;
    }),
    select("Koleksiyon", s.groups, s.tenant, (v) => {
      s.tenant = v;
      void changeGroup();
    }),
    button("Çıkış yap", logout, "log"),
  );
  nav.addStyleClass("hb-navigation");
  nav.addEventDelegate({
    onAfterRendering: () => {
      nav.getDomRef()?.setAttribute("role", "navigation");
      nav
        .getDomRef()
        ?.setAttribute("aria-label", mobile ? "Mobil menü" : "Ana menü");
    },
  });
  return nav;
}
function showMenu() {
  if (menuDialog) return;
  menuDialog = new U.Dialog({
    title: "Menü",
    contentWidth: "22rem",
    horizontalScrolling: false,
    content: [navigation(true)],
    endButton: button("Menüyü kapat", () => menuDialog?.close()),
    afterClose: () => {
      const d = menuDialog;
      menuDialog = null;
      d?.destroy();
    },
  });
  menuDialog.setModel(model);
  menuDialog.open();
}
const snapshot = () => ({
  ...JSON.parse(JSON.stringify(s)),
  title: sections.find((x) => x.id === s.tab)?.name || "Genel bakış",
  locationOptions: [{ id: "", name: "Tüm konumlar" }, ...s.locations],
  tagOptions: [{ id: "", name: "Tüm etiketler" }, ...s.tags],
});
let model: InstanceType<typeof U.JSONModel>;
function sync() {
  model.setData(snapshot());
}
function showLogin() {
  mountedTab = "";
  menuDialog?.close();
  activeDialog?.close();
  const password = new U.Input({
    width: "100%",
    type: "Password",
    value: "",
    liveChange: (e) => (loginForm.password = e.getParameter("value") || ""),
    submit: () => {
      void submit();
    },
  });
  const toggle = button(
    "Şifreyi göster",
    () => {
      const show = password.getType() === "Password";
      password.setType(show ? "Text" : "Password");
      toggle.setText(show ? "Şifreyi gizle" : "Şifreyi göster");
    },
    "show",
  );
  function submit() {
    if (!loginForm.email.trim() || !loginForm.password) {
      s.error = "E-posta ve şifrenizi girin.";
      return;
    }
    return login();
  }
  const email = input("E-posta", loginForm, "email", { type: "Email" });
  const form = stack(
    new U.Image({
      src: logo,
      width: "16rem",
      height: "2.74rem",
      alt: "Homebox",
      decorative: false,
      densityAware: false,
    }),
    title("Evine hoş geldin.", "H1"),
    text("Homebox hesabınla giriş yap, eşyaların bir arada olsun."),
    errorStrip(),
    email,
    field("Şifre", password),
    toggle,
    button("Giriş yap", submit, "log", true).setWidth("100%"),
    button("Davet ile hesap oluştur", register),
    text("OpenUI5 · Homebox UI v0.4.0"),
  ).addStyleClass("hb-login-card");
  return new U.VBox({
    width: "100%",
    alignItems: "Center",
    justifyContent: "Center",
    items: [form],
  }).addStyleClass("hb-login");
}
function register() {
  const f = { name: "", email: "", password: "", token: "" };
  const d: Dialog = new U.Dialog({
    title: "Davet ile hesap oluştur",
    contentWidth: "28rem",
    horizontalScrolling: false,
    content: [
      stack(
        errorStrip(),
        input("Ad soyad", f, "name"),
        input("E-posta", f, "email", { type: "Email" }),
        input("Şifre", f, "password", { type: "Password" }),
        input("Davet kodu", f, "token"),
      ).addStyleClass("sapUiResponsiveContentPadding"),
    ],
    buttons: [
      button(
        "Hesap oluştur",
        () =>
          guarded(async () => {
            await api.register(f);
            loginForm.email = f.email;
            flash("Hesap oluşturuldu. Şimdi giriş yapabilirsiniz.");
            d.close();
          }),
        "add",
        true,
      ),
      button("Vazgeç", () => d.close()),
    ],
    afterClose: () => d.destroy(),
  });
  d.setModel(model);
  d.open();
}
function showShell() {
  const themeButton = new U.OverflowToolbarButton({
    text: "Koyu görünüm",
    tooltip: "Koyu görünüm",
    icon: "sap-icon://lightbulb",
    press: () => (s.dark = !s.dark),
  });
  themeButton.bindProperty("text", {
    path: "/dark",
    formatter: (dark: boolean) => (dark ? "Açık görünüm" : "Koyu görünüm"),
  });
  themeButton.bindProperty("tooltip", {
    path: "/dark",
    formatter: (dark: boolean) => (dark ? "Açık görünüm" : "Koyu görünüm"),
  });
  const shell = new U.ShellBar({
    title: "Homebox",
    secondTitle: "{/title}",
    showMenuButton: true,
    menuButtonPressed: showMenu,
    additionalContent: [
      themeButton,
      new U.OverflowToolbarButton({
        text: "Verileri yenile",
        tooltip: "Verileri yenile",
        icon: "sap-icon://refresh",
        press: () => {
          void refresh().then(renderPage);
        },
      }),
    ],
  });
  // ShellBar uses a localized generic tooltip; provide the action name used in this app.
  shell.addEventDelegate({
    onAfterRendering: () =>
      shell
        .getDomRef()
        ?.querySelector("button")
        ?.setAttribute("aria-label", "Menüyü aç"),
  });
  const sidebar = navigation().addStyleClass("hb-sidebar");
  pageHost = stack().addStyleClass("hb-page");
  pageHost.addEventDelegate({
    onAfterRendering: () => {
      pageHost.getDomRef()?.setAttribute("role", "main");
      pageHost.getDomRef()?.setAttribute("tabindex", "-1");
    },
  });
  return stack(
    shell,
    new U.HBox({ items: [sidebar, pageHost], width: "100%" }).addStyleClass(
      "hb-workspace",
    ),
  ).addStyleClass("hb-shell");
}
function mount() {
  root?.destroy();
  document.getElementById("app")!.textContent = "";
  root = s.user ? showShell() : showLogin();
  root.setModel(model);
  root.placeAt("app");
  if (s.user) renderPage();
}
function renderPage() {
  if (!s.user || !pageHost || pageHost.isDestroyed()) return;
  mountedTab = s.tab;
  pageHost.destroyItems();
  const entry = sections.find((x) => x.id === s.tab)!;
  pageHost.addItem(errorStrip());
  pageHost.addItem(text(currentGroup()?.name || "Benim evim"));
  const action =
    s.tab === "overview" || s.tab === "inventory"
      ? button("Ürün ekle", () => edit(), "add", true)
      : s.tab === "locations" || s.tab === "tags"
        ? button(
            s.tab === "locations" ? "Konum ekle" : "Etiket ekle",
            () => openOrganizer(s.tab === "locations" ? "locations" : "tags"),
            "add",
            true,
          )
        : null;
  pageHost.addItem(
    row(
      title(s.tab === "overview" ? "Evine bir bakış." : entry.name, "H1"),
      ...(action ? [action] : []),
    ).addStyleClass("hb-page-heading"),
  );
  pageHost.addItem(text(entry.description));
  const views: Record<TabId, () => Control> = {
    overview,
    inventory,
    locations: management.organizers,
    tags: management.organizers,
    types: management.types,
    templates: management.templates,
    maintenance: management.maintenance,
    users: management.users,
    tools: management.tools,
  };
  pageHost.addItem(views[s.tab]());
  pageHost.addItem(
    text("Homebox UI v0.4.0 · OpenUI5").addStyleClass("hb-footer"),
  );
}
let modalVersion = 0;
let closingModal: Promise<void> | null = null;
async function renderModal() {
  const version = ++modalVersion;
  const old = activeDialog;
  activeDialog = null;
  if (old && !old.isDestroyed()) {
    closingModal = new Promise<void>((resolve) => {
      old.attachAfterClose(() => resolve());
      old.close();
    });
  }
  if (closingModal) {
    await closingModal;
    closingModal = null;
  }
  if (version !== modalVersion) return;
  if (!s.modal || !s.user) return;
  let d: Dialog;
  const onClose = () => {
    if (activeDialog === d) {
      activeDialog = null;
      close();
    }
  };
  d =
    s.modal === "edit"
      ? itemEditor(onClose)
      : s.modal === "detail"
        ? itemDetail(onClose)
        : organizerEditor(onClose);
  activeDialog = d;
}
export function start() {
  model = new U.JSONModel(snapshot());
  model.setSizeLimit(10000);
  setAppModel(model);
  theme();
  mount();
  let syncQueued = false;
  watch(
    s,
    () => {
      if (!syncQueued) {
        syncQueued = true;
        queueMicrotask(() => {
          syncQueued = false;
          sync();
        });
      }
    },
    { deep: true },
  );
  watch(
    () => !!s.user,
    () => {
      sync();
      mount();
    },
  );
  watch(
    () => s.tab,
    () => {
      if (mountedTab !== s.tab) {
        sync();
        renderPage();
      }
    },
  );
  let modalQueued = false;
  watch(
    () => [s.modal, s.selected] as const,
    () => {
      if (!modalQueued) {
        modalQueued = true;
        queueMicrotask(() => {
          modalQueued = false;
          renderModal();
        });
      }
    },
  );
  watch(() => s.dark, theme);
  watch(
    () => s.notice,
    (message) => {
      if (message) U.MessageToast.show(message);
    },
  );
  watch(
    () => s.tenant,
    () => {
      menuDialog?.close();
      if (s.user)
        queueMicrotask(() => {
          sync();
          mount();
        });
    },
  );
  window.addEventListener("hashchange", () => {
    const hash = location.hash.slice(1) as TabId;
    if (tabIds.includes(hash) && s.tab !== hash) navigate(hash);
  });
  window.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      s.user &&
      !s.modal &&
      !menuDialog &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement)?.tagName,
      )
    ) {
      e.preventDefault();
      document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }
  });
  void restoreSession().catch(handleError);
}
