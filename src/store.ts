import { reactive, watch } from "vue";
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
  type Template,
} from "./api";
import {
  cleanFields,
  copyFields,
  mergeTemplateFields,
} from "./fields";

export const api = new HomeboxApi(
  (localStorage.getItem("hb-mode") as Mode) || "entities",
);

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

export const s = reactive({
  user: null as { name: string; email: string } | null,
  groups: [] as Group[],
  tenant: sessionStorage.getItem("hb-tenant") || "",
  currency: "TRY",
  mode: api.mode as Mode,
  demo: false,
  busy: false,
  saving: false,
  error: "",
  notice: "",
  tab: "overview" as TabId,
  mobileNav: false,
  view: "grid" as "grid" | "list",
  search: "",
  locationFilter: "",
  tagFilter: "",
  archived: false,
  page: 1,
  locations: [] as Organizer[],
  tags: [] as Organizer[],
  types: [] as EntityType[],
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
  modal: null as "detail" | "edit" | "organizer" | null,
  selected: null as Item | null,
  organizerKind: "locations" as "locations" | "tags",
  organizer: null as Organizer | null,
  deleteConfirm: false,
  uploadType: "photo",
  dark: localStorage.getItem("hb-theme") === "dark",
  demoItems: [] as Item[],
  demoTemplates: [] as Template[],
});

export const loginForm = reactive({
  email: "",
  password: "",
  mode: api.mode as Mode,
});

export const organizerForm = reactive({
  name: "",
  description: "",
  entityTypeId: "",
  parentId: "",
});

export const form = reactive({
  name: "",
  description: "",
  quantity: 1,
  locationId: "",
  parentId: "",
  entityTypeId: "",
  tagIds: [] as string[],
  purchasePrice: 0,
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
  purchaseDate: "",
  warrantyExpires: "",
  notes: "",
  archived: false,
  fields: [] as CustomField[],
});

// ---- Formatting -----------------------------------------------------------
export const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: s.currency,
    maximumFractionDigits: 0,
  }).format(n || 0);
export const date = (v: unknown) =>
  typeof v === "string" && v && !v.startsWith("0001")
    ? new Date(v).toLocaleDateString("tr-TR")
    : "—";
export const dateOnly = (v: unknown) =>
  typeof v === "string" && !v.startsWith("0001") ? v.slice(0, 10) : "";

export const isAuthenticated = () => !!s.user || s.demo;
export const currentGroup = () => s.groups.find((g) => g.id === s.tenant);

// ---- UI helpers -------------------------------------------------------------
export function setTheme() {
  document.documentElement.classList.toggle("dark", s.dark);
  localStorage.setItem("hb-theme", s.dark ? "dark" : "light");
}
watch(() => s.dark, setTheme);

let noticeTimer: ReturnType<typeof setTimeout>;
export function flash(message: string) {
  s.notice = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (s.notice = ""), 4500);
}
export function close() {
  s.modal = null;
  s.deleteConfirm = false;
}
export function handleError(e: unknown) {
  s.error = e instanceof Error ? e.message : String(e);
  if (e instanceof ApiError && e.status === 401) {
    s.user = null;
    api.session = null;
    sessionStorage.removeItem("hb-session");
    close();
  }
}
/** Runs a task with the shared saving flag and error handling. */
export async function guarded(task: () => Promise<void>) {
  s.saving = true;
  s.error = "";
  try {
    await task();
  } catch (e) {
    handleError(e);
  } finally {
    s.saving = false;
  }
}
export function navigate(id: TabId) {
  s.tab = id;
  s.mobileNav = false;
  s.page = 1;
  s.search = "";
  s.locationFilter = "";
  s.tagFilter = "";
  s.error = "";
  window.location.hash = id;
}
export function filterOrganizer(kind: string, id: string) {
  navigate("inventory");
  if (kind === "locations") s.locationFilter = id;
  else s.tagFilter = id;
}
/** Features that need a real Homebox server explain themselves in demo mode. */
export function needsServer() {
  if (!s.demo) return false;
  flash("Bu özellik için kendi Homebox hesabınla giriş yap.");
  return true;
}

// ---- Loading --------------------------------------------------------------
let loadVersion = 0;
export async function loadItems() {
  if (!isAuthenticated()) return;
  const version = ++loadVersion;
  s.busy = true;
  s.error = "";
  try {
    if (s.demo) {
      const needle = s.search.toLocaleLowerCase("tr");
      const list = s.demoItems.filter(
        (i) =>
          (!needle ||
            (i.name + " " + i.description)
              .toLocaleLowerCase("tr")
              .includes(needle)) &&
          (!s.locationFilter || i.location?.id === s.locationFilter) &&
          (!s.tagFilter || i.tags.some((t) => t.id === s.tagFilter)) &&
          (s.archived || !i.archived),
      );
      s.result = {
        items: list.slice((s.page - 1) * 12, s.page * 12),
        total: list.length,
        totalPrice: list.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0),
        page: s.page,
        pageSize: 12,
      };
    } else {
      const data = await api.list({
        page: s.page,
        pageSize: 12,
        q: s.search,
        includeArchived: s.archived,
        orderBy: "updatedAt",
        ...(api.mode === "entities"
          ? {
              isLocation: false,
              parentIds: s.locationFilter ? [s.locationFilter] : undefined,
            }
          : { locations: s.locationFilter ? [s.locationFilter] : undefined }),
        tags: s.tagFilter ? [s.tagFilter] : undefined,
      });
      if (version === loadVersion) s.result = data;
    }
  } catch (e) {
    if (version === loadVersion) handleError(e);
  } finally {
    if (version === loadVersion) s.busy = false;
  }
}

function demoStats(): Stats {
  return {
    totalItems: s.demoItems.length,
    totalItemPrice: s.demoItems.reduce(
      (sum, i) => sum + i.purchasePrice * i.quantity,
      0,
    ),
    totalLocations: s.locations.length,
    totalTags: s.tags.length,
    totalWithWarranty: 2,
  };
}

export async function refresh() {
  if (s.demo) {
    s.stats = demoStats();
    return loadItems();
  }
  s.busy = true;
  s.error = "";
  try {
    const data = await Promise.all([
      api.locations(),
      api.tags(),
      api.types(),
      api.stats(),
    ]);
    s.locations = data[0];
    s.tags = data[1];
    s.types = data[2];
    s.stats = data[3];
    await loadItems();
  } catch (e) {
    handleError(e);
  } finally {
    s.busy = false;
  }
}

let filterTimer: ReturnType<typeof setTimeout>;
watch(
  () => [s.search, s.locationFilter, s.tagFilter, s.archived],
  () => {
    s.page = 1;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(loadItems, 250);
  },
);
watch(() => s.page, loadItems);

// ---- Session ----------------------------------------------------------------
export async function establish() {
  s.user = await api.self();
  s.groups = await api.groups();
  if (!s.groups.some((g) => g.id === s.tenant))
    s.tenant = s.groups[0]?.id || "";
  api.tenant = s.tenant;
  s.currency = currentGroup()?.currency || "TRY";
  sessionStorage.setItem("hb-tenant", s.tenant);
  await refresh();
}

export async function login() {
  s.busy = true;
  s.error = "";
  api.mode = loginForm.mode;
  s.mode = api.mode;
  localStorage.setItem("hb-mode", api.mode);
  try {
    const session = await api.login(loginForm.email, loginForm.password);
    sessionStorage.setItem("hb-session", JSON.stringify(session));
    loginForm.password = "";
    await establish();
  } catch (e) {
    handleError(e);
  } finally {
    s.busy = false;
  }
}

export async function logout() {
  if (!s.demo) {
    try {
      await api.request("/users/logout", { method: "POST" });
    } catch (e) {
      handleError(e);
    }
  }
  s.demo = false;
  s.user = null;
  api.session = null;
  api.tenant = "";
  sessionStorage.removeItem("hb-session");
  sessionStorage.removeItem("hb-tenant");
  close();
  s.result.items = [];
}

export async function changeGroup() {
  api.tenant = s.tenant;
  sessionStorage.setItem("hb-tenant", s.tenant);
  s.currency = currentGroup()?.currency || "TRY";
  s.page = 1;
  s.locationFilter = "";
  s.tagFilter = "";
  close();
  await refresh();
}

export async function restoreSession() {
  setTheme();
  const hash = window.location.hash.slice(1) as TabId;
  if (tabIds.includes(hash)) s.tab = hash;
  const stored = sessionStorage.getItem("hb-session");
  if (!stored) return;
  try {
    const session = JSON.parse(stored) as Session;
    if (!session.expiresAt || new Date(session.expiresAt) > new Date()) {
      api.session = session;
      await establish();
    } else sessionStorage.removeItem("hb-session");
  } catch (e) {
    handleError(e);
  }
}

// ---- Items ------------------------------------------------------------------
export async function openItem(item: Item) {
  await guarded(async () => {
    s.selected = s.demo
      ? JSON.parse(JSON.stringify(item))
      : await api.item(item.id);
    s.modal = "detail";
  });
}

export function edit(item: Item | null = null) {
  s.selected = item;
  Object.assign(form, {
    name: item?.name || "",
    description: item?.description || "",
    quantity: item?.quantity ?? 1,
    locationId: item?.location?.id || s.locations[0]?.id || "",
    parentId: item?.parent?.id || "",
    entityTypeId:
      item?.entityType?.id || s.types.find((t) => !t.isLocation)?.id || "",
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
  });
  s.error = "";
  s.modal = "edit";
  if (!item) void applyTypeTemplate();
}

export async function saveItem() {
  s.saving = true;
  s.error = "";
  try {
    const base = {
      name: form.name.trim(),
      description: form.description,
      quantity: form.quantity,
      tagIds: form.tagIds,
      ...(api.mode === "entities"
        ? { entityTypeId: form.entityTypeId, parentId: form.parentId || null }
        : { locationId: form.locationId, parentId: form.parentId || null }),
    };
    const changes = {
      ...base,
      purchasePrice: form.purchasePrice,
      manufacturer: form.manufacturer,
      modelNumber: form.modelNumber,
      serialNumber: form.serialNumber,
      notes: form.notes,
      archived: form.archived,
      fields: cleanFields(form.fields),
      warrantyExpires: form.warrantyExpires || "0001-01-01",
      ...(api.mode === "entities"
        ? { purchaseDate: form.purchaseDate || "0001-01-01" }
        : { purchaseTime: form.purchaseDate || "0001-01-01" }),
    };
    if (s.demo) {
      const id = s.selected?.id || crypto.randomUUID();
      const item = {
        ...s.selected,
        ...changes,
        id,
        tags: s.tags.filter((t) => form.tagIds.includes(t.id)),
        entityType:
          s.types.find((t) => t.id === form.entityTypeId) ||
          s.selected?.entityType,
        location:
          s.locations.find(
            (l) =>
              l.id === (api.mode === "entities" ? form.parentId : form.locationId),
          ) || null,
        updatedAt: new Date().toISOString(),
      } as Item;
      s.demoItems = s.demoItems.filter((i) => i.id !== id);
      s.demoItems.unshift(item);
      close();
      await refresh();
      flash("Demo envanteri güncellendi.");
    } else {
      let item: Item;
      if (s.selected) item = await api.update(s.selected, changes);
      else {
        item = await api.create(base);
        s.selected = item;
        try {
          item = await api.update(item, changes);
        } catch (e) {
          s.modal = "edit";
          throw new Error(
            `Ürün oluşturuldu; ek bilgiler kaydedilemedi. Formu tekrar kaydedebilirsiniz. ${e instanceof Error ? e.message : ""}`,
          );
        }
      }
      s.selected = item;
      s.modal = "detail";
      await refresh();
      flash("Ürün kaydedildi.");
    }
  } catch (e) {
    handleError(e);
  } finally {
    s.saving = false;
  }
}

export async function removeItem() {
  const target = s.selected;
  if (!target) return;
  await guarded(async () => {
    if (s.demo) s.demoItems = s.demoItems.filter((i) => i.id !== target.id);
    else await api.delete(target.id);
    close();
    await refresh();
    flash("Ürün silindi.");
  });
}

export async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const target = s.selected;
  if (!file || !target) return;
  if (needsServer()) {
    input.value = "";
    return;
  }
  await guarded(async () => {
    await api.upload(target.id, file, s.uploadType);
    s.selected = await api.item(target.id);
    await loadItems();
    flash("Dosya yüklendi.");
  });
  input.value = "";
}

export function photo(item: Item) {
  const id = item.thumbnailId || item.imageId;
  return id ? api.attachmentUrl(item.id, id) : "";
}

// ---- Locations and tags -----------------------------------------------------
export function openOrganizer(
  kind: "locations" | "tags",
  existing: Organizer | null = null,
) {
  s.organizerKind = kind;
  s.organizer = existing;
  Object.assign(organizerForm, {
    name: existing?.name || "",
    description: existing?.description || "",
    entityTypeId:
      existing?.entityType?.id || s.types.find((t) => t.isLocation)?.id || "",
    parentId: existing?.parent?.id || "",
  });
  s.error = "";
  s.modal = "organizer";
}

export async function saveOrganizer() {
  await guarded(async () => {
    const body = {
      name: organizerForm.name.trim(),
      description: organizerForm.description,
      ...(s.organizerKind === "locations"
        ? {
            parentId: organizerForm.parentId || null,
            ...(api.mode === "entities"
              ? {
                  entityTypeId: organizerForm.entityTypeId,
                  ...(!s.organizer ? { quantity: 1, tagIds: [] } : {}),
                }
              : {}),
          }
        : {}),
    };
    if (s.demo) {
      const list = s.organizerKind === "locations" ? s.locations : s.tags;
      const value = {
        ...s.organizer,
        ...body,
        id: s.organizer?.id || crypto.randomUUID(),
      } as Organizer;
      const next = list.filter((i) => i.id !== value.id);
      next.push(value);
      if (s.organizerKind === "locations") s.locations = next;
      else s.tags = next;
    } else
      await api.saveOrganizer(s.organizerKind, body, s.organizer || undefined);
    close();
    await refresh();
    flash("Kaydedildi.");
  });
}

// ---- Entity types and templates (custom field schemas) ----------------------
const typeTemplateKey = (typeId: string) =>
  `hb-type-template:${s.tenant}:${typeId}`;
export const typeTemplate = (typeId: string) =>
  localStorage.getItem(typeTemplateKey(typeId)) || "";
export function setTypeTemplate(typeId: string, templateId: string) {
  if (templateId) localStorage.setItem(typeTemplateKey(typeId), templateId);
  else localStorage.removeItem(typeTemplateKey(typeId));
}

/** Fills a new item's custom fields from the template chosen for its type. */
export async function applyTypeTemplate() {
  const templateId = typeTemplate(form.entityTypeId);
  if (!templateId) return;
  try {
    const template = s.demo
      ? s.demoTemplates.find((t) => t.id === templateId)
      : await api.template(templateId);
    if (template)
      form.fields = mergeTemplateFields(form.fields, template.fields || []);
  } catch {
    // The template may have been deleted; the form still works without it.
  }
}

export async function listTemplates(): Promise<Template[]> {
  return s.demo ? [...s.demoTemplates] : api.templates();
}

export async function saveTemplate(
  body: Record<string, unknown>,
  existing?: Template,
) {
  if (!s.demo) return api.templateSave(body, existing);
  const value = {
    ...existing,
    ...body,
    id: existing?.id || crypto.randomUUID(),
  } as Template;
  s.demoTemplates = [...s.demoTemplates.filter((t) => t.id !== value.id), value];
  return value;
}

export async function deleteTemplate(id: string) {
  if (s.demo) s.demoTemplates = s.demoTemplates.filter((t) => t.id !== id);
  else await api.templateDelete(id);
}

export async function saveType(
  body: Record<string, unknown>,
  existing?: EntityType,
) {
  if (!s.demo) {
    await api.typeSave(body, existing);
    s.types = await api.types();
    return;
  }
  const value = {
    ...existing,
    ...body,
    id: existing?.id || crypto.randomUUID(),
  } as EntityType;
  s.types = [...s.types.filter((t) => t.id !== value.id), value];
}

export async function deleteType(id: string) {
  if (s.demo) s.types = s.types.filter((t) => t.id !== id);
  else {
    await api.typeDelete(id);
    s.types = await api.types();
  }
  setTypeTemplate(id, "");
}

// ---- Demo mode --------------------------------------------------------------
export function startDemo() {
  s.demo = true;
  s.error = "";
  s.currency = "TRY";
  s.locations = [
    { id: "living", name: "Salon", description: "Günlük yaşam alanı", itemCount: 2 },
    { id: "kitchen", name: "Mutfak", description: "Kahve, yemek ve küçük aletler", itemCount: 2 },
    { id: "office", name: "Çalışma odası", description: "Teknoloji ve çalışma ekipmanları", itemCount: 3 },
  ];
  s.tags = [
    { id: "tech", name: "Teknoloji" },
    { id: "appliance", name: "Ev aletleri" },
    { id: "audio", name: "Ses & müzik" },
  ];
  s.types = [
    { id: "item", name: "Ürün", isLocation: false },
    { id: "location", name: "Konum", isLocation: true },
  ];
  s.demoTemplates = [
    {
      id: "tpl-network",
      name: "Ağ cihazı",
      description: "Ağ ürünleri için ortak alanlar",
      fields: [
        { name: "IP adresi", type: "text", textValue: "" },
        { name: "Port sayısı", type: "number", numberValue: 4 },
        { name: "PoE destekli", type: "boolean", booleanValue: false },
      ],
    },
  ];
  const data: Array<[string, string, string, number, string, string, string]> = [
    ["Siemens EQ700", "Tam otomatik kahve makinesi", "kitchen", 42500, "appliance", "Siemens", "TP715R01"],
    ["UniFi Gateway Max", "Ev ağının merkezi", "office", 10500, "tech", "Ubiquiti", "UCG-Max"],
    ["Yale Linus L2", "Akıllı kapı kilidi", "living", 12500, "tech", "Yale", "Linus L2"],
    ["Lenovo ThinkCentre", "Ev sunucusu ve Home Assistant", "office", 7500, "tech", "Lenovo", "M720Q"],
    ["Apple HomePod mini", "Müzik ve akıllı ev", "living", 4800, "audio", "Apple", "HomePod mini"],
    ["Bosch Serie 6", "Bulaşık makinesi", "kitchen", 28500, "appliance", "Bosch", "Serie 6"],
    ["SteelSeries Arctis Nova 7", "Kablosuz kulaklık", "office", 6900, "audio", "SteelSeries", "Nova 7"],
  ];
  s.demoItems = data.map(
    ([name, description, loc, price, tag, manufacturer, modelNumber], i) =>
      ({
        id: String(i),
        name,
        description,
        quantity: 1,
        purchasePrice: price,
        tags: s.tags.filter((t) => t.id === tag),
        location: s.locations.find((l) => l.id === loc),
        parent: s.locations.find((l) => l.id === loc),
        entityType: s.types[0],
        manufacturer,
        modelNumber,
        updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
        attachments: [],
        fields: [],
      }) as Item,
  );
  void refresh();
}
