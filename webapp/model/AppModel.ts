import JSONModel from "sap/ui/model/json/JSONModel";
import Theming from "sap/ui/core/Theming";
import MessageToast from "sap/m/MessageToast";
import {
  ApiError,
  HomeboxApi,
  type CustomField,
  type EntityType,
  type Group,
  type Item,
  type Mode,
  type Organizer,
  type Page,
  type Session,
  type Stats,
} from "../service/HomeboxApi";
import { cleanFields, copyFields, mergeTemplateFields } from "./fields";
import { dateOnly } from "./formatter";
export const tabIds = [
  "overview",
  "inventory",
  "locations",
  "tags",
  "types",
  "templates",
  "maintenance",
  "users",
  "tools",
] as const;
export type TabId = (typeof tabIds)[number];
export const titles: Record<TabId, string> = {
  overview: "Genel bakış",
  inventory: "Envanterim",
  locations: "Konumlar",
  tags: "Etiketler",
  types: "Ürün türleri",
  templates: "Alan şablonları",
  maintenance: "Bakım",
  users: "Kullanıcılar",
  tools: "Araçlar",
};
export function itemForm(item: Item | null, types: EntityType[]) {
  return {
    name: item?.name || "",
    description: item?.description || "",
    quantity: item?.quantity ?? 1,
    locationId: item?.location?.id || "",
    parentId: item?.parent?.id || "",
    entityTypeId:
      item?.entityType?.id || types.find((t) => !t.isLocation)?.id || "",
    tagIds: (item?.tags || []).map((t) => t.id),
    purchasePrice: item?.purchasePrice || 0,
    manufacturer: item?.manufacturer || "",
    modelNumber: item?.modelNumber || "",
    serialNumber: item?.serialNumber || "",
    purchaseDate: dateOnly(item?.purchaseDate || item?.purchaseTime),
    warrantyExpires: dateOnly(item?.warrantyExpires),
    notes: item?.notes || "",
    archived: item?.archived || false,
    fields: copyFields(item?.fields),
  };
}
function initialState() {
  return {
    user: null as { name: string; email: string } | null,
    groups: [] as Group[],
    tenant: sessionStorage.getItem("hb-tenant") || "",
    currency: "TRY",
    mode: (localStorage.getItem("hb-mode") as Mode) || "entities",
    busy: false,
    saving: false,
    error: "",
    tab: "overview" as TabId,
    title: titles.overview,
    routeName: "home",
    orderBy: "updatedAt",
    groupName: "Benim evim",
    search: "",
    locationFilter: "",
    tagFilter: "",
    archived: false,
    page: 1,
    view: "grid",
    locations: [] as Organizer[],
    tags: [] as Organizer[],
    types: [] as EntityType[],
    itemTypes: [] as EntityType[],
    locationTypes: [] as EntityType[],
    locationOptions: [{ id: "", name: "Tüm konumlar" }] as Organizer[],
    tagOptions: [{ id: "", name: "Tüm etiketler" }] as Organizer[],
    parentOptions: [{ id: "", name: "Yok" }] as Organizer[],
    result: {
      items: [],
      total: 0,
      totalPrice: 0,
      page: 1,
      pageSize: 12,
    } as Page,
    stats: {
      totalItems: 0,
      totalItemPrice: 0,
      totalLocations: 0,
      totalTags: 0,
      totalWithWarranty: 0,
    } as Stats,
    selected: null as Item | null,
    form: itemForm(null, []),
    organizerForm: {
      name: "",
      description: "",
      parentId: "",
      entityTypeId: "",
    },
    organizer: null as Organizer | null,
    organizerKind: "locations" as "locations" | "tags",
    uploadType: "photo",
    dark: (localStorage.getItem("hb-theme") || "dark") === "dark",
    isPhone: innerWidth < 768,
    sideExpanded: innerWidth >= 1024,
  };
}
export type AppState = ReturnType<typeof initialState>;
/** @namespace homebox.model */
export default class AppModel extends JSONModel {
  public api: HomeboxApi;
  private loadVersion = 0;
  private contextVersion = 0;
  private selectionVersion = 0;
  private pending = 0;
  private filterTimer?: ReturnType<typeof setTimeout>;
  constructor(baseUri = "/api/v1") {
    super(initialState());
    this.setSizeLimit(10000);
    this.api = new HomeboxApi(this.state().mode, undefined, baseUri);
    this.applyTheme();
  }
  public state(): AppState {
    return this.getData() as AppState;
  }
  public update(values: Partial<AppState>) {
    for (const [key, value] of Object.entries(values))
      this.setProperty(`/${key}`, value);
  }
  public flash(message: string) {
    MessageToast.show(message);
  }
  public applyTheme() {
    const dark = this.state().dark;
    Theming.setTheme(dark ? "sap_horizon_dark" : "sap_horizon");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("hb-theme", dark ? "dark" : "light");
  }
  public toggleTheme() {
    this.update({ dark: !this.state().dark });
    this.applyTheme();
  }
  public handleError(error: unknown) {
    this.setProperty(
      "/error",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof ApiError && error.status === 401) {
      this.clearSession();
      this.fireEvent("sessionChanged");
    }
  }
  public async run<T>(task: () => Promise<T>): Promise<T | undefined> {
    this.pending++;
    this.update({ saving: true, error: "" });
    try {
      return await task();
    } catch (e) {
      this.handleError(e);
      return undefined;
    } finally {
      this.pending--;
      this.setProperty("/saving", this.pending > 0);
    }
  }
  private clearSession() {
    this.contextVersion++;
    this.loadVersion++;
    clearTimeout(this.filterTimer);
    this.api.session = null;
    this.api.tenant = "";
    sessionStorage.removeItem("hb-session");
    sessionStorage.removeItem("hb-tenant");
    const error = this.state().error;
    this.setData({ ...initialState(), error });
  }
  public async restoreSession() {
    const stored = sessionStorage.getItem("hb-session");
    if (!stored) return;
    await this.run(async () => {
      const session = JSON.parse(stored) as Session;
      if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
        this.clearSession();
        return;
      }
      this.api.session = session;
      await this.establish();
    });
  }
  public async login(email: string, password: string) {
    return this.run(async () => {
      this.update({ busy: true });
      try {
        const session = await this.api.login(email, password);
        sessionStorage.setItem("hb-session", JSON.stringify(session));
        await this.establish();
        return true;
      } finally {
        this.setProperty("/busy", false);
      }
    });
  }
  private async establish() {
    const user = await this.api.self();
    const groups = await this.api.groups();
    const tenant = groups.some((g) => g.id === this.state().tenant)
      ? this.state().tenant
      : groups[0]?.id || "";
    this.api.tenant = tenant;
    sessionStorage.setItem("hb-tenant", tenant);
    const mode = await this.api.detectMode();
    localStorage.setItem("hb-mode", mode);
    const group = groups.find((g) => g.id === tenant);
    this.update({
      user,
      groups,
      tenant,
      mode,
      currency: group?.currency || "TRY",
      groupName: group?.name || "Benim evim",
    });
    await this.refresh();
    this.fireEvent("sessionChanged");
  }
  public async logout() {
    try {
      await this.api.request("/users/logout", { method: "POST" });
    } catch {
      /* Clear the local session even if the server is unavailable. */
    }
    this.clearSession();
    this.fireEvent("sessionChanged");
  }
  public async changeGroup(tenant: string) {
    this.contextVersion++;
    this.loadVersion++;
    this.api.tenant = tenant;
    sessionStorage.setItem("hb-tenant", tenant);
    const group = this.state().groups.find((g) => g.id === tenant);
    const empty = initialState();
    this.update({
      result: empty.result,
      stats: empty.stats,
      locations: [],
      tags: [],
      types: [],
      itemTypes: [],
      locationTypes: [],
      locationOptions: empty.locationOptions,
      tagOptions: empty.tagOptions,
      parentOptions: empty.parentOptions,
      tenant,
      currency: group?.currency || "TRY",
      groupName: group?.name || "Benim evim",
      selected: null,
      organizer: null,
      form: empty.form,
      organizerForm: empty.organizerForm,
      search: "",
      page: 1,
      locationFilter: "",
      tagFilter: "",
    });
    this.fireEvent("closeDialogs");
    await this.refresh();
  }
  public async refresh() {
    if (!this.state().user) return;
    const context = this.contextVersion;
    this.update({ busy: true, error: "" });
    try {
      const [locations, tags, types, stats] = await Promise.all([
        this.api.locations(),
        this.api.tags(),
        this.api.types(),
        this.api.stats(),
      ]);
      if (context !== this.contextVersion) return;
      this.update({
        locations,
        tags,
        types,
        stats,
        itemTypes: types.filter((t) => !t.isLocation),
        locationTypes: types.filter((t) => t.isLocation),
        locationOptions: [{ id: "", name: "Tüm konumlar" }, ...locations],
        tagOptions: [{ id: "", name: "Tüm etiketler" }, ...tags],
        parentOptions: [{ id: "", name: "Yok" }, ...locations],
      });
      await this.loadItems();
      if (context === this.contextVersion) this.fireEvent("contextChanged");
    } catch (e) {
      if (context === this.contextVersion) this.handleError(e);
    } finally {
      if (context === this.contextVersion) this.setProperty("/busy", false);
    }
  }
  public decorate(item: Item): Item {
    const photo = item.thumbnailId || item.imageId;
    return {
      ...item,
      displayPurchaseDate: item.purchaseDate || item.purchaseTime,
      photoUrl: photo ? this.api.attachmentUrl(item.id, photo) : "",
      attachments: (item.attachments || []).map((a) => ({
        ...a,
        url: this.api.attachmentUrl(item.id, a.id),
      })),
    };
  }
  public async loadItems() {
    if (!this.state().user) return;
    const version = ++this.loadVersion,
      context = this.contextVersion;
    this.update({ busy: true, error: "" });
    const s = this.state();
    try {
      const result = await this.api.list({
        page: s.page,
        pageSize: 12,
        q: s.search,
        includeArchived: s.archived,
        orderBy: s.orderBy,
        ...(this.api.mode === "entities"
          ? {
              isLocation: false,
              parentIds: s.locationFilter ? [s.locationFilter] : undefined,
            }
          : { locations: s.locationFilter ? [s.locationFilter] : undefined }),
        tags: s.tagFilter ? [s.tagFilter] : undefined,
      });
      if (version === this.loadVersion && context === this.contextVersion)
        this.setProperty("/result", {
          ...result,
          items: result.items.map((item) => this.decorate(item)),
        });
    } catch (e) {
      if (version === this.loadVersion && context === this.contextVersion)
        this.handleError(e);
    } finally {
      if (version === this.loadVersion && context === this.contextVersion)
        this.setProperty("/busy", false);
    }
  }
  public filter() {
    this.setProperty("/page", 1);
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      void this.loadItems();
    }, 250);
  }
  public async selectItem(id: string) {
    const version = ++this.selectionVersion,
      context = this.contextVersion;
    return this.run(async () => {
      const item = this.decorate(await this.api.item(id));
      if (version !== this.selectionVersion || context !== this.contextVersion)
        return;
      this.setProperty("/selected", item);
      return item;
    });
  }
  public async prepareItem(item: Item | null = null) {
    this.update({
      selected: item,
      form: itemForm(item, this.state().types),
      error: "",
    });
    const parents =
      this.state().mode === "entities" ? [...this.state().locations] : [];
    if (item?.parent && !parents.some((x) => x.id === item.parent?.id))
      parents.push(item.parent);
    this.setProperty("/parentOptions", [{ id: "", name: "Yok" }, ...parents]);
    if (!item) await this.applyTypeTemplate();
  }
  public typeTemplate(typeId: string) {
    return (
      localStorage.getItem(
        `hb-type-template:${this.state().tenant}:${typeId}`,
      ) || ""
    );
  }
  public setTypeTemplate(typeId: string, templateId: string) {
    const key = `hb-type-template:${this.state().tenant}:${typeId}`;
    if (templateId) localStorage.setItem(key, templateId);
    else localStorage.removeItem(key);
  }
  public async applyTypeTemplate() {
    const id = this.typeTemplate(this.state().form.entityTypeId);
    if (!id) return;
    try {
      const t = await this.api.template(id);
      this.setProperty(
        "/form/fields",
        mergeTemplateFields(this.state().form.fields, t.fields || []),
      );
    } catch {
      /* A removed optional default template must not block the item form. */
    }
  }
  public async saveItem() {
    return this.run(async () => {
      const f = this.state().form;
      if (!f.name.trim()) throw new Error("Lütfen ürün adını girin.");
      if (Number(f.quantity) < 1) throw new Error("Adet en az 1 olmalıdır.");
      const base = {
        name: f.name.trim(),
        description: f.description,
        quantity: Number(f.quantity),
        tagIds: f.tagIds,
        ...(this.api.mode === "entities"
          ? { entityTypeId: f.entityTypeId, parentId: f.parentId || null }
          : { locationId: f.locationId, parentId: f.parentId || null }),
      };
      const changes = {
        ...base,
        purchasePrice: Number(f.purchasePrice) || 0,
        manufacturer: f.manufacturer,
        modelNumber: f.modelNumber,
        serialNumber: f.serialNumber,
        notes: f.notes,
        archived: f.archived,
        fields: cleanFields(f.fields),
        warrantyExpires: f.warrantyExpires || "0001-01-01",
        ...(this.api.mode === "entities"
          ? { purchaseDate: f.purchaseDate || "0001-01-01" }
          : { purchaseTime: f.purchaseDate || "0001-01-01" }),
      };
      let item = this.state().selected;
      if (item) item = await this.api.update(item, changes);
      else {
        item = await this.api.create(base);
        this.setProperty("/selected", item);
        try {
          item = await this.api.update(item, changes);
        } catch (e) {
          throw new Error(
            `Ürün oluşturuldu; ek bilgiler kaydedilemedi. Formu tekrar kaydedebilirsiniz. ${e instanceof Error ? e.message : ""}`,
          );
        }
      }
      const selected = this.decorate(item);
      this.setProperty("/selected", selected);
      await this.refresh();
      this.flash("Ürün kaydedildi.");
      return selected;
    });
  }
  public async removeItem() {
    return this.run(async () => {
      const item = this.state().selected;
      if (!item) return false;
      await this.api.delete(item.id);
      this.setProperty("/selected", null);
      await this.refresh();
      this.flash("Ürün silindi.");
      return true;
    });
  }
  public async upload(file: File) {
    await this.run(async () => {
      const item = this.state().selected;
      if (!item) return;
      await this.api.upload(item.id, file, this.state().uploadType);
      this.setProperty(
        "/selected",
        this.decorate(await this.api.item(item.id)),
      );
      await this.loadItems();
      this.flash("Dosya yüklendi.");
    });
  }
  public prepareOrganizer(
    kind: "locations" | "tags",
    organizer: Organizer | null = null,
  ) {
    this.update({
      organizerKind: kind,
      organizer,
      error: "",
      organizerForm: {
        name: organizer?.name || "",
        description: organizer?.description || "",
        parentId: organizer?.parent?.id || "",
        entityTypeId:
          organizer?.entityType?.id || this.state().locationTypes[0]?.id || "",
      },
    });
    this.setProperty("/parentOptions", [
      { id: "", name: "Yok" },
      ...this.state().locations.filter((x) => x.id !== organizer?.id),
    ]);
  }
  public async saveOrganizer() {
    return this.run(async () => {
      const s = this.state(),
        f = s.organizerForm;
      if (!f.name.trim()) throw new Error("Lütfen bir ad girin.");
      const organizer = await this.api.saveOrganizer(
        s.organizerKind,
        {
          name: f.name.trim(),
          description: f.description,
          ...(s.organizerKind === "locations"
            ? {
                parentId: f.parentId || null,
                ...(this.api.mode === "entities"
                  ? {
                      entityTypeId: f.entityTypeId,
                      ...(!s.organizer ? { quantity: 1, tagIds: [] } : {}),
                    }
                  : {}),
              }
            : {}),
        },
        s.organizer || undefined,
      );
      await this.refresh();
      this.setProperty("/organizer", organizer);
      this.flash("Kaydedildi.");
      return organizer;
    });
  }
}
