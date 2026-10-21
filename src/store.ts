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
import { cleanFields, copyFields, mergeTemplateFields } from "./fields";

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

export const isAuthenticated = () => !!s.user;
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
// ---- Loading --------------------------------------------------------------
let loadVersion = 0;
export async function loadItems() {
  if (!isAuthenticated()) return;
  const version = ++loadVersion;
  s.busy = true;
  s.error = "";
  try {
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
  } catch (e) {
    if (version === loadVersion) handleError(e);
  } finally {
    if (version === loadVersion) s.busy = false;
  }
}

export async function refresh() {
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
  try {
    await api.request("/users/logout", { method: "POST" });
  } catch (e) {
    handleError(e);
  }
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
    s.selected = await api.item(item.id);
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
    await api.delete(target.id);
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
    const template = await api.template(templateId);
    if (template)
      form.fields = mergeTemplateFields(form.fields, template.fields || []);
  } catch {
    // The template may have been deleted; the form still works without it.
  }
}

export async function listTemplates(): Promise<Template[]> {
  return api.templates();
}

export async function saveTemplate(
  body: Record<string, unknown>,
  existing?: Template,
) {
  return api.templateSave(body, existing);
}

export async function deleteTemplate(id: string) {
  await api.templateDelete(id);
}

export async function saveType(
  body: Record<string, unknown>,
  existing?: EntityType,
) {
  await api.typeSave(body, existing);
  s.types = await api.types();
}

export async function deleteType(id: string) {
  await api.typeDelete(id);
  s.types = await api.types();
  setTypeTemplate(id, "");
}
