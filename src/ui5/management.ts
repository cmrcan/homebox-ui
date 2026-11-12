import type Control from "sap/ui/core/Control";
import type { EntityType, Template } from "../api";
import { cleanFields, copyFields } from "../fields";
import { U } from "./runtime";
import {
  area,
  button,
  checkbox,
  confirm,
  dialog,
  download,
  field,
  input,
  panel,
  requireName,
  row,
  select,
  stack,
  text,
} from "./shared";
import { fieldsEditor, loadMaintenance } from "./inventory";
import {
  api,
  currentGroup,
  deleteTemplate,
  deleteType,
  filterOrganizer,
  flash,
  guarded,
  handleError,
  logout,
  openOrganizer,
  refresh,
  s,
  saveTemplate,
  saveType,
  setTypeTemplate,
  typeTemplate,
} from "../store";

export function organizers() {
  const kind = s.tab === "locations" ? "locations" : "tags";
  const host = stack();
  host.bindAggregation("items", {
    path: kind === "locations" ? "/locations" : "/tags",
    factory: (_id, ctx) => {
      const o = ctx.getObject() as {
        id: string;
        name: string;
        description?: string;
        itemCount?: number;
      };
      return panel(
        o.name,
        text(o.description || ""),
        text(`${o.itemCount ?? 0} ürün`),
        row(
          button("Ürünleri gör", () => filterOrganizer(kind, o.id), "product"),
          button("Düzenle", () => openOrganizer(kind, o), "edit"),
        ),
      );
    },
  });
  return host;
}
export function types() {
  const host = stack();
  const load = () =>
    guarded(async () => {
      const templates = s.mode === "entities" ? await api.templates() : [];
      if (host.isDestroyed()) return;
      host.destroyItems();
      host.addItem(button("Tür ekle", () => openType(), "add", true));
      if (s.mode !== "entities")
        host.addItem(
          text("Ürün türleri için Homebox entities API gereklidir."),
        );
      for (const t of s.types)
        host.addItem(
          panel(
            t.name,
            text(t.isLocation ? "Konum türü" : "Ürün türü"),
            text(t.description || ""),
            select(
              "Varsayılan alan şablonu",
              [{ id: "", name: "Şablon yok" }, ...templates],
              typeTemplate(t.id),
              (v) => {
                setTypeTemplate(t.id, v);
                flash("Varsayılan alan şablonu kaydedildi.");
              },
            ),
            row(
              button("Düzenle", () => openType(t), "edit"),
              button(
                "Sil",
                () =>
                  confirm(`“${t.name}” türü silinsin mi?`, async () => {
                    await deleteType(t.id);
                    await load();
                  }),
                "delete",
              ),
            ),
          ),
        );
    });
  function openType(existing?: EntityType) {
    const f = {
      name: existing?.name || "",
      description: existing?.description || "",
      isLocation: existing?.isLocation || false,
    };
    const d = dialog(
      existing ? "Türü düzenle" : "Tür ekle",
      [
        input("Tür adı", f, "name"),
        area("Açıklama", f, "description"),
        checkbox("Konum türü", f.isLocation, (v) => (f.isLocation = v)),
      ],
      [
        button(
          "Türü kaydet",
          () => {
            if (requireName(f.name))
              void guarded(async () => {
                await saveType(f, existing);
                d.close();
                await load();
              });
          },
          "save",
          true,
        ),
      ],
    );
  }
  void load();
  return host;
}
export function templates() {
  const host = stack();
  const load = () =>
    guarded(async () => {
      const entries = (await api.templates()) || [];
      if (host.isDestroyed()) return;
      host.destroyItems();
      host.addItem(button("Şablon ekle", () => openTemplate(), "add", true));
      if (!entries.length) host.addItem(text("Henüz alan şablonu yok."));
      for (const t of entries)
        host.addItem(
          panel(
            t.name,
            text(t.description || ""),
            row(
              button(
                "Düzenle",
                () =>
                  guarded(async () => openTemplate(await api.template(t.id))),
                "edit",
              ),
              button(
                "Sil",
                () =>
                  confirm(`“${t.name}” şablonu silinsin mi?`, async () => {
                    await deleteTemplate(t.id);
                    await load();
                  }),
                "delete",
              ),
            ),
          ),
        );
    });
  function openTemplate(existing?: Template) {
    const f = {
      name: existing?.name || "",
      description: existing?.description || "",
      defaultName: existing?.defaultName || "",
      defaultManufacturer: existing?.defaultManufacturer || "",
      defaultModelNumber: existing?.defaultModelNumber || "",
      defaultQuantity: existing?.defaultQuantity ?? 1,
      fields: copyFields(existing?.fields),
    };
    const d = dialog(
      existing ? "Şablonu düzenle" : "Şablon ekle",
      [
        input("Şablon adı", f, "name"),
        area("Açıklama", f, "description"),
        input("Varsayılan ürün adı", f, "defaultName"),
        input("Varsayılan marka", f, "defaultManufacturer"),
        input("Varsayılan model", f, "defaultModelNumber"),
        input("Varsayılan adet", f, "defaultQuantity", { type: "Number" }),
        fieldsEditor(f.fields),
      ],
      [
        button(
          "Şablonu kaydet",
          () => {
            if (requireName(f.name))
              void guarded(async () => {
                await saveTemplate(
                  { ...f, fields: cleanFields(f.fields) },
                  existing,
                );
                d.close();
                flash("Şablon kaydedildi.");
                await load();
              });
          },
          "save",
          true,
        ),
      ],
    );
  }
  void load();
  return host;
}
export function maintenance() {
  const list = stack();
  const host = stack(
    select(
      "Bakım durumu",
      [
        { id: "scheduled", name: "Planlanan" },
        { id: "completed", name: "Tamamlanan" },
        { id: "both", name: "Tümü" },
      ],
      "scheduled",
      (v) => {
        void loadMaintenance(
          list,
          undefined,
          v as "scheduled" | "completed" | "both",
        );
      },
    ),
    list,
  );
  void loadMaintenance(list, undefined, "scheduled");
  return host;
}
export function users() {
  const profile = { name: s.user?.name || "", email: s.user?.email || "" };
  const password = { current: "", next: "", again: "" };
  const group = { name: currentGroup()?.name || "", currency: s.currency };
  const invite = { uses: 1, days: 7 };
  const token = stack();
  const members = stack();
  const deleteText = { value: "" };
  const host = stack(
    panel(
      "Profil",
      input("Ad soyad", profile, "name"),
      input("E-posta", profile, "email", { type: "Email" }),
      button(
        "Profili kaydet",
        () =>
          guarded(async () => {
            s.user = await api.updateSelf(profile);
            flash("Profil güncellendi.");
          }),
        "save",
        true,
      ),
    ),
    panel(
      "Şifre değiştir",
      input("Mevcut şifre", password, "current", { type: "Password" }),
      input("Yeni şifre", password, "next", { type: "Password" }),
      input("Yeni şifre tekrar", password, "again", { type: "Password" }),
      button(
        "Şifreyi değiştir",
        () =>
          guarded(async () => {
            if (password.next !== password.again)
              throw new Error("Yeni şifreler eşleşmiyor.");
            if (!password.next) throw new Error("Yeni şifreyi girin.");
            await api.changePassword(password.current, password.next);
            flash("Şifre değiştirildi.");
          }),
        "locked",
      ),
    ),
    panel(
      "Koleksiyon",
      input("Koleksiyon adı", group, "name"),
      input("Para birimi", group, "currency"),
      button(
        "Koleksiyonu kaydet",
        () =>
          guarded(async () => {
            const saved = await api.updateGroup(group);
            const i = s.groups.findIndex((x) => x.id === s.tenant);
            if (i >= 0) s.groups[i] = { ...s.groups[i], ...saved };
            s.currency = group.currency;
            flash("Koleksiyon güncellendi.");
          }),
        "save",
      ),
    ),
    panel(
      "Davet oluştur",
      input("Kullanım sayısı", invite, "uses", { type: "Number" }),
      input("Geçerlilik (gün)", invite, "days", { type: "Number" }),
      button(
        "Davet oluştur",
        () =>
          guarded(async () => {
            const result = await api.invite(
              invite.uses,
              new Date(Date.now() + invite.days * 86400000).toISOString(),
            );
            token.destroyItems();
            token.addItem(text(result.token));
            token.addItem(
              button(
                "Davet kodunu kopyala",
                () =>
                  guarded(async () => {
                    await navigator.clipboard.writeText(result.token);
                    flash("Davet kodu kopyalandı.");
                  }),
                "copy",
              ),
            );
          }),
        "add",
      ),
      token,
    ),
    panel("Koleksiyon üyeleri", members),
    panel(
      "Hesabı sil",
      text("Hesabın silinmesi geri alınamaz. Devam etmek için SİL yazın."),
      input("Onay metni", deleteText, "value"),
      button(
        "Hesabı sil",
        () => {
          if (deleteText.value === "SİL")
            confirm("Hesabınız kalıcı olarak silinsin mi?", async () => {
              await api.deleteSelf();
              await logout();
            });
          else s.error = "Onay için SİL yazın.";
        },
        "delete",
      ),
    ),
  );
  void api
    .members()
    .then((entries) => {
      if (members.isDestroyed()) return;
      for (const member of entries || [])
        members.addItem(
          row(
            text(
              `${member.name} · ${member.email || ""}${member.isOwner ? " · Sahip" : ""}`,
            ),
            ...(!member.isOwner
              ? [
                  button(
                    "Üyeyi çıkar",
                    () =>
                      confirm("Üye koleksiyondan çıkarılsın mı?", async () => {
                        await api.removeMember(member.id);
                        members.destroyItems();
                        members.addItem(
                          text(
                            "Üye çıkarıldı. Listeyi yenilemek için sayfayı tekrar açın.",
                          ),
                        );
                      }),
                    "delete",
                  ),
                ]
              : []),
          ),
        );
    })
    .catch((e) => {
      if ((e as { status?: number }).status === 401) handleError(e);
      else if (!members.isDestroyed())
        members.addItem(
          text(
            "Üye listesi alınamadı. Sunucu sürümünü ve yetkilerinizi kontrol edin.",
          ),
        );
    });
  return host;
}
export function tools() {
  const notifier = { name: "", url: "" };
  const notifierList = stack();
  const actions = [
    ["ensure-asset-ids", "Eksik varlık numaralarını ata"],
    ["ensure-import-refs", "İçe aktarma referanslarını tamamla"],
    ["set-primary-photos", "Ana fotoğrafları belirle"],
    ["create-missing-thumbnails", "Eksik küçük resimleri oluştur"],
    ["zero-item-time-fields", "Tarihlerden saat bilgisini sil"],
  ];
  let importFile: File | undefined;
  const upload = new U.FileUploader({
    buttonOnly: true,
    buttonText: "CSV dosyası seç",
    fileType: ["csv"],
    change: (e) => {
      importFile = e.getParameter("files")?.[0] as File | undefined;
      fileName.setText(importFile?.name || "Dosya seçilmedi.");
    },
  });
  const fileName = text("Dosya seçilmedi.");
  const host = stack(
    panel(
      "Envanteri aktar",
      button(
        "CSV dışa aktar",
        () =>
          guarded(async () =>
            download(await api.exportCsv(), "homebox-envanter.csv"),
          ),
        "download",
      ),
      upload,
      fileName,
      button(
        "CSV içe aktar",
        () => {
          if (!importFile) {
            s.error = "Önce bir CSV dosyası seçin.";
            return;
          }
          void guarded(async () => {
            const result = await api.importCsv(importFile!);
            flash(`${result?.completed ?? 0} kayıt içe aktarıldı.`);
            importFile = undefined;
            fileName.setText("Dosya seçilmedi.");
            await refresh();
          });
        },
        "upload",
      ),
    ),
    panel(
      "Bildirimler",
      input("Bildirim adı", notifier, "name"),
      input("Bildirim URL", notifier, "url"),
      row(
        button(
          "Bildirim ekle",
          () => {
            if (requireName(notifier.name))
              void guarded(async () => {
                await api.saveNotifier({ ...notifier, isActive: true });
                await loadNotifiers();
                flash("Bildirim eklendi.");
              });
          },
          "add",
        ),
        button(
          "Test bildirimi gönder",
          () =>
            guarded(async () => {
              await api.testNotifier(notifier.url);
              flash("Test bildirimi gönderildi.");
            }),
          "paper-plane",
        ),
      ),
      notifierList,
    ),
    panel(
      "Bakım araçları",
      ...actions.map(([id, name]) =>
        button(
          name,
          () => {
            U.MessageBox.confirm(
              `“${name}” işlemi tüm koleksiyona uygulansın mı?`,
              {
                onClose: (action) => {
                  if (action === "OK")
                    void guarded(async () => {
                      const r = await api.runAction(id);
                      flash(`${r?.completed ?? 0} kayıt işlendi.`);
                      await refresh();
                    });
                },
              },
            );
          },
          "wrench",
        ),
      ),
    ),
  );
  async function loadNotifiers() {
    try {
      const entries = (await api.notifiers()) || [];
      if (notifierList.isDestroyed()) return;
      notifierList.destroyItems();
      for (const n of entries)
        notifierList.addItem(
          row(
            text(n.name),
            checkbox("Etkin", n.isActive, (v) => {
              void guarded(async () => {
                await api.saveNotifier({ name: n.name, isActive: v }, n);
                await loadNotifiers();
              });
            }),
            button(
              "Sil",
              () =>
                confirm("Bildirim silinsin mi?", async () => {
                  await api.deleteNotifier(n.id);
                  await loadNotifiers();
                }),
              "delete",
            ),
          ),
        );
    } catch (e) {
      if ((e as { status?: number }).status === 401) handleError(e);
      else if (!notifierList.isDestroyed())
        notifierList.addItem(
          text(
            "Bildirim listesi alınamadı. Sunucu sürümünü ve yetkilerinizi kontrol edin.",
          ),
        );
    }
  }
  void loadNotifiers();
  return host;
}
