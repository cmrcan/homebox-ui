import type Control from "sap/ui/core/Control";
import type Dialog from "sap/m/Dialog";
import type { CustomField, Item, Maintenance } from "../api";
import {
  blankField,
  fieldDisplay,
  fieldTypes,
  mergeTemplateFields,
} from "../fields";
import { watch } from "@vue/reactivity";
import { U } from "./runtime";
import {
  area,
  button,
  checkbox,
  confirm,
  dateInput,
  dialog,
  field,
  input,
  panel,
  requireName,
  row,
  select,
  stack,
  text,
  title,
} from "./shared";
import {
  api,
  applyTypeTemplate,
  close,
  date,
  edit,
  filterOrganizer,
  flash,
  form,
  guarded,
  money,
  loadItems,
  openItem,
  organizerForm,
  photo,
  removeItem,
  s,
  saveItem,
  saveOrganizer,
} from "../store";

export function fieldsEditor(fields: CustomField[]) {
  const body = stack();
  const render = () => {
    body.destroyItems();
    for (const f of fields) {
      const value = stack();
      const renderValue = () => {
        value.destroyItems();
        if (f.type === "boolean")
          value.addItem(
            checkbox(
              "Alan değeri",
              !!f.booleanValue,
              (v) => (f.booleanValue = v),
            ),
          );
        else if (f.type === "time")
          value.addItem(dateInput("Alan değeri", f, "timeValue"));
        else
          value.addItem(
            input(
              "Alan değeri",
              f,
              f.type === "number" ? "numberValue" : "textValue",
              { type: f.type === "number" ? "Number" : "Text" },
            ),
          );
      };
      renderValue();
      body.addItem(
        panel(
          f.name || "Yeni alan",
          input("Alan adı", f, "name"),
          select("Alan türü", fieldTypes, f.type, (v) => {
            f.type = v as CustomField["type"];
            renderValue();
          }),
          value,
          button(
            "Alanı kaldır",
            () => {
              fields.splice(fields.indexOf(f), 1);
              render();
            },
            "delete",
          ),
        ),
      );
    }
    body.addItem(
      button(
        "Alan ekle",
        () => {
          fields.push(blankField());
          render();
        },
        "add",
      ),
    );
  };
  render();
  return body;
}

export function inventory(): Control {
  const search = new U.SearchField({
    width: "100%",
    placeholder: "Ürün adı, marka veya seri numarası",
    value: "{/search}",
    liveChange: (e) => {
      s.search = e.getParameter("newValue") || "";
    },
    search: (e) => {
      s.search = e.getParameter("query") || "";
    },
  });
  const location = new U.Select({
    width: "100%",
    selectedKey: "{/locationFilter}",
    items: {
      path: "/locations",
      template: new U.Item({ key: "{id}", text: "{name}" }),
      templateShareable: false,
    },
    change: (e) => {
      s.locationFilter = e.getParameter("selectedItem")?.getKey() || "";
    },
  });
  // Keep the "all" choice outside the server-provided locations.
  location.bindAggregation("items", {
    path: "/locationOptions",
    template: new U.Item({ key: "{id}", text: "{name}" }),
    templateShareable: false,
  });
  const tags = new U.Select({
    width: "100%",
    selectedKey: "{/tagFilter}",
    items: {
      path: "/tagOptions",
      template: new U.Item({ key: "{id}", text: "{name}" }),
      templateShareable: false,
    },
    change: (e) => {
      s.tagFilter = e.getParameter("selectedItem")?.getKey() || "";
    },
  });
  const filters = row(
    field("Konuma göre filtrele", location),
    field("Etikete göre filtrele", tags),
    new U.CheckBox({
      text: "Arşivdekileri dahil et",
      selected: "{/archived}",
      select: (e) => {
        s.archived = !!e.getParameter("selected");
      },
    }),
  );
  const grid = new U.FlexBox({
    renderType: "Bare",
    wrap: "Wrap",
    items: {
      path: "/result/items",
      factory: (_id, ctx) => {
        const item = ctx.getObject() as Item;
        const card = new U.Panel({
          content: [
            stack(
              photo(item)
                ? new U.Image({
                    src: photo(item),
                    height: "10rem",
                    width: "100%",
                    densityAware: false,
                    decorative: false,
                    alt: item.name,
                  })
                : new U.Icon({
                    src: "sap-icon://product",
                    size: "3rem",
                    decorative: true,
                  }).addStyleClass("hb-product-icon"),
              button(item.name, () => openItem(item)),
              text(item.parent?.name || item.location?.name || "Konumsuz"),
              new U.ObjectNumber({
                number: money(item.purchasePrice),
                unit: `${item.quantity} adet`,
              }),
            ),
          ],
        }).addStyleClass("hb-item-card");
        return card;
      },
    },
  }).addStyleClass("hb-cards");
  grid.bindProperty("visible", {
    path: "/view",
    formatter: (v: string) => v === "grid",
  });
  const table = new U.Table({
    fixedLayout: false,
    columns: [
      new U.Column({ header: text("Ürün") }),
      new U.Column({
        header: text("Konum"),
        minScreenWidth: "Tablet",
        demandPopin: true,
      }),
      new U.Column({
        header: text("Adet"),
        minScreenWidth: "Tablet",
        demandPopin: true,
      }),
      new U.Column({
        header: text("Değer"),
        hAlign: "End",
        minScreenWidth: "Tablet",
        demandPopin: true,
      }),
    ],
    items: {
      path: "/result/items",
      factory: (_id, ctx) => {
        const item = ctx.getObject() as Item;
        return new U.ColumnListItem({
          type: "Active",
          press: () => {
            void openItem(item);
          },
          cells: [
            text(item.name),
            text(item.parent?.name || item.location?.name || "—"),
            text(String(item.quantity)),
            text(money(item.purchasePrice)),
          ],
        });
      },
    },
  });
  table.bindProperty("visible", {
    path: "/view",
    formatter: (v: string) => v === "list",
  });
  const empty = stack(
    title("Eşleşen ürün bulunamadı"),
    text(
      "Aramayı veya filtreleri değiştirebilir, yeni bir ürün ekleyebilirsin.",
    ),
  );
  empty.bindProperty("visible", {
    path: "/result/total",
    formatter: (n: number) => n === 0,
  });
  const prev = button(
    "Önceki",
    () => {
      if (s.page > 1) s.page--;
    },
    "navigation-left-arrow",
  );
  prev.bindProperty("enabled", {
    path: "/page",
    formatter: (n: number) => n > 1,
  });
  const next = button(
    "Sonraki",
    () => {
      if (s.page * 12 < s.result.total) s.page++;
    },
    "navigation-right-arrow",
  );
  next.bindProperty("enabled", {
    parts: ["/page", "/result/total"],
    formatter: (p: number, n: number) => p * 12 < n,
  });
  const count = new U.Text({
    text: {
      parts: ["/page", "/result/total"],
      formatter: (p: number, n: number) =>
        `${n} ürün · Sayfa ${p} / ${Math.max(1, Math.ceil(n / 12))}`,
    },
  });
  return stack(
    field("Envanterde ara", search),
    filters,
    row(
      button("Kart görünümü", () => (s.view = "grid"), "grid"),
      button("Liste görünümü", () => (s.view = "list"), "list"),
    ),
    grid,
    table,
    empty,
    row(prev, count, next),
  );
}

export function overview() {
  const stats = new U.FlexBox({
    renderType: "Bare",
    wrap: "Wrap",
    items: [
      ["Toplam ürün", "totalItems"],
      ["Toplam değer", "totalItemPrice"],
      ["Konumlar", "totalLocations"],
      ["Garantili ürün", "totalWithWarranty"],
    ].map(([label, key]) =>
      new U.Panel({
        headerText: label,
        content: [
          new U.ObjectNumber({
            number: {
              path: `/stats/${key}`,
              formatter: (v: number) =>
                key === "totalItemPrice" ? money(v) : String(v || 0),
            },
          }),
        ],
      }).addStyleClass("hb-stat"),
    ),
  }).addStyleClass("hb-cards");
  return stack(stats, title("Envanterin"), inventory());
}

export function itemEditor(onClose: () => void): Dialog {
  const inputs: Control[] = [
    input("Ürün adı", form, "name", { required: true }),
    area("Açıklama", form, "description"),
    input("Adet", form, "quantity", { type: "Number" }),
    select(
      "Ürün türü",
      s.types.filter((x) => !x.isLocation),
      form.entityTypeId,
      (v) => {
        form.entityTypeId = v;
        void applyTypeTemplate();
      },
    ),
  ];
  if (s.mode === "entities") {
    const parents = [...s.locations];
    if (
      s.selected?.parent &&
      !parents.some((x) => x.id === s.selected?.parent?.id)
    )
      parents.push(s.selected.parent);
    inputs.push(
      select(
        "Üst konum / ürün",
        [{ id: "", name: "Yok" }, ...parents],
        form.parentId,
        (v) => (form.parentId = v),
      ),
    );
  } else
    inputs.push(
      select(
        "Konum",
        [{ id: "", name: "Yok" }, ...s.locations],
        form.locationId,
        (v) => (form.locationId = v),
      ),
    );
  inputs.push(
    field(
      "Etiketler",
      new U.MultiComboBox({
        width: "100%",
        selectedKeys: [...form.tagIds],
        items: s.tags.map((t) => new U.Item({ key: t.id, text: t.name })),
        selectionFinish: (e) =>
          (form.tagIds =
            e.getParameter("selectedItems")?.map((x) => x.getKey()) || []),
      }),
    ),
    input(`Satın alma değeri (${s.currency})`, form, "purchasePrice", {
      type: "Number",
    }),
    input("Marka", form, "manufacturer"),
    input("Model", form, "modelNumber"),
    input("Seri numarası", form, "serialNumber"),
    dateInput("Satın alma tarihi", form, "purchaseDate"),
    dateInput("Garanti bitişi", form, "warrantyExpires"),
    area("Notlar", form, "notes"),
    checkbox("Arşivlendi", form.archived, (v) => (form.archived = v)),
  );
  const fields = stack(fieldsEditor(form.fields));
  const stop = watch(
    () => form.fields,
    () => {
      fields.destroyItems();
      fields.addItem(fieldsEditor(form.fields));
    },
  );
  inputs.push(
    panel(
      "Özel alanlar",
      button(
        "Şablondan ekle",
        () =>
          guarded(async () => {
            const entries = await api.templates();
            let selected = entries[0]?.id || "";
            const d = dialog(
              "Şablondan alan ekle",
              [
                select(
                  "Alan şablonu",
                  entries,
                  selected,
                  (v) => (selected = v),
                ),
              ],
              [
                button(
                  "Alanları ekle",
                  () =>
                    guarded(async () => {
                      if (!selected) throw new Error("Önce bir şablon seçin.");
                      const template = await api.template(selected);
                      form.fields = mergeTemplateFields(
                        form.fields,
                        template.fields || [],
                      );
                      d.close();
                    }),
                  "add",
                  true,
                ),
              ],
            );
          }),
        "document-text",
      ),
      fields,
    ),
  );
  return dialog(
    s.selected ? "Ürünü düzenle" : "Ürün ekle",
    inputs,
    [
      button(
        "Ürünü kaydet",
        () => {
          if (requireName(form.name)) return saveItem();
        },
        "save",
        true,
      ),
    ],
    () => {
      stop();
      onClose();
    },
  );
}

export function itemDetail(onClose: () => void): Dialog {
  const item = s.selected!;
  const content: Control[] = [
    text(item.description || ""),
    new U.SimpleForm({
      editable: false,
      layout: "ResponsiveGridLayout",
      content: [
        new U.Label({ text: "Konum" }),
        text(item.parent?.name || item.location?.name || "—"),
        new U.Label({ text: "Değer" }),
        text(money(item.purchasePrice)),
        new U.Label({ text: "Adet" }),
        text(String(item.quantity)),
        new U.Label({ text: "Marka / Model" }),
        text(
          [item.manufacturer, item.modelNumber].filter(Boolean).join(" · ") ||
            "—",
        ),
        new U.Label({ text: "Seri numarası" }),
        text(item.serialNumber || "—"),
        new U.Label({ text: "Satın alma tarihi" }),
        text(date(item.purchaseDate || item.purchaseTime)),
        new U.Label({ text: "Garanti bitişi" }),
        text(date(item.warrantyExpires)),
        new U.Label({ text: "Etiketler" }),
        text((item.tags || []).map((t) => t.name).join(", ") || "—"),
      ],
    }),
    text(item.notes || ""),
  ];
  if (photo(item))
    content.unshift(
      new U.Image({
        src: photo(item),
        width: "100%",
        height: "14rem",
        decorative: false,
        alt: item.name,
        densityAware: false,
      }),
    );
  for (const f of (item.fields as CustomField[]) || [])
    content.push(field(f.name, text(fieldDisplay(f))));
  const fileType = select(
    "Dosya türü",
    [
      { id: "photo", name: "Fotoğraf" },
      { id: "receipt", name: "Fatura" },
      { id: "warranty", name: "Garanti" },
      { id: "manual", name: "Kılavuz" },
      { id: "attachment", name: "Diğer" },
    ],
    s.uploadType,
    (v) => (s.uploadType = v),
  );
  const uploader = new U.FileUploader({
    buttonOnly: true,
    buttonText: "Dosya yükle",
    sameFilenameAllowed: true,
    change: (e) => {
      const file = e.getParameter("files")?.[0] as File | undefined;
      if (file)
        void guarded(async () => {
          await api.upload(item.id, file, s.uploadType);
          s.selected = await api.item(item.id);
          await loadItems();
          flash("Dosya yüklendi.");
        });
    },
  });
  content.push(
    panel(
      "Dosyalar",
      fileType,
      uploader,
      ...(item.attachments || []).map(
        (a) =>
          new U.Link({
            text: a.title,
            href: api.attachmentUrl(item.id, a.id),
            target: "_blank",
          }),
      ),
    ),
  );
  const maintenance = stack(
    button("Bakım kayıtlarını göster", () =>
      loadMaintenance(maintenance, item.id),
    ),
  );
  content.push(panel("Bakım", maintenance));
  content.push(
    row(
      button(
        "Etiket yazdır",
        () => window.open(api.labelUrl(item.id), "_blank", "noopener"),
        "print",
      ),
      button(
        "Sil",
        () => confirm(`“${item.name}” silinsin mi?`, removeItem),
        "delete",
      ),
    ),
  );
  return dialog(
    item.name,
    content,
    [button("Düzenle", () => edit(item), "edit", true)],
    onClose,
  );
}

const emptyDate = "0001-01-01";
export async function loadMaintenance(
  host: InstanceType<typeof U.VBox>,
  itemId?: string,
  status: "scheduled" | "completed" | "both" = "both",
) {
  await guarded(async () => {
    const entries =
      (await (itemId
        ? api.itemMaintenance(itemId)
        : api.maintenanceList(status))) || [];
    if (host.isDestroyed()) return;
    host.destroyItems();
    if (!entries.length) host.addItem(text("Bakım kaydı bulunmuyor."));
    for (const m of entries)
      host.addItem(
        panel(
          m.name,
          text(m.description || ""),
          text(
            `Planlanan: ${date(m.scheduledDate)} · Tamamlanan: ${date(m.completedDate)} · ${money(Number(m.cost))}`,
          ),
          row(
            ...(!m.completedDate || m.completedDate.startsWith("0001")
              ? [
                  button(
                    "Tamamlandı",
                    () =>
                      guarded(async () => {
                        await api.saveMaintenance(m.id, {
                          name: m.name,
                          description: m.description || "",
                          cost: String(m.cost || 0),
                          scheduledDate: m.scheduledDate || emptyDate,
                          completedDate: new Date().toISOString().slice(0, 10),
                        });
                        await loadMaintenance(host, itemId, status);
                      }),
                    "accept",
                  ),
                ]
              : []),
            button(
              "Sil",
              () =>
                confirm("Bakım kaydı silinsin mi?", async () => {
                  await api.deleteMaintenance(m.id);
                  await loadMaintenance(host, itemId, status);
                }),
              "delete",
            ),
          ),
        ),
      );
    if (itemId) {
      const f = { name: "", description: "", cost: 0, scheduledDate: "" };
      host.addItem(
        panel(
          "Bakım ekle",
          input("Bakım adı", f, "name"),
          area("Açıklama", f, "description"),
          input("Maliyet", f, "cost", { type: "Number" }),
          dateInput("Planlanan tarih", f, "scheduledDate"),
          button(
            "Bakımı kaydet",
            () => {
              if (requireName(f.name))
                void guarded(async () => {
                  await api.addMaintenance(itemId, {
                    ...f,
                    cost: String(f.cost),
                    scheduledDate: f.scheduledDate || emptyDate,
                    completedDate: emptyDate,
                  });
                  await loadMaintenance(host, itemId);
                });
            },
            "add",
            true,
          ),
        ),
      );
    }
  });
}

export function organizerEditor(onClose: () => void) {
  const content: Control[] = [
    input("Ad", organizerForm, "name", { required: true }),
    area("Açıklama", organizerForm, "description"),
  ];
  if (s.organizerKind === "locations") {
    if (s.mode === "entities")
      content.push(
        select(
          "Konum türü",
          s.types.filter((x) => x.isLocation),
          organizerForm.entityTypeId,
          (v) => (organizerForm.entityTypeId = v),
        ),
      );
    content.push(
      select(
        "Üst konum",
        [
          { id: "", name: "Yok" },
          ...s.locations.filter((x) => x.id !== s.organizer?.id),
        ],
        organizerForm.parentId,
        (v) => (organizerForm.parentId = v),
      ),
    );
  }
  return dialog(
    s.organizerKind === "locations" ? "Konum" : "Etiket",
    content,
    [
      button(
        "Kaydet",
        () => {
          if (requireName(organizerForm.name)) return saveOrganizer();
        },
        "save",
        true,
      ),
    ],
    onClose,
  );
}
