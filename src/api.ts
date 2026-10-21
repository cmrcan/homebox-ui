export type Mode = "entities" | "legacy";
export interface Organizer {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
  parent?: Organizer | null;
  parentId?: string | null;
  color?: string;
  icon?: string;
  entityType?: EntityType | null;
}
export interface EntityType {
  id: string;
  name: string;
  isLocation: boolean;
  description?: string;
  icon?: string;
  color?: string;
  [key: string]: unknown;
}
export type FieldType = "text" | "number" | "boolean" | "time";
export interface CustomField {
  id?: string;
  name: string;
  type: FieldType;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  timeValue?: string;
}
export interface Group {
  id: string;
  name: string;
  currency: string;
}
export interface Template {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  defaultQuantity?: number;
  defaultName?: string;
  defaultDescription?: string;
  defaultManufacturer?: string;
  defaultModelNumber?: string;
  defaultLifetimeWarranty?: boolean;
  defaultInsured?: boolean;
  fields?: CustomField[];
  [key: string]: unknown;
}
export interface Member {
  id: string;
  name: string;
  email?: string;
  isOwner?: boolean;
}
export interface Invitation {
  token: string;
  expiresAt?: string;
  uses?: number;
}
export interface Maintenance {
  id: string;
  name: string;
  description?: string;
  cost?: string | number;
  scheduledDate?: string;
  completedDate?: string;
  itemName?: string;
  entityName?: string;
  [key: string]: unknown;
}
export interface Notifier {
  id: string;
  name: string;
  isActive: boolean;
  url?: string;
  [key: string]: unknown;
}
export interface Attachment {
  id: string;
  title: string;
  type: string;
  mimeType: string;
}
export interface Item extends Organizer {
  quantity: number;
  purchasePrice: number;
  tags: Organizer[];
  location?: Organizer | null;
  thumbnailId?: string | null;
  imageId?: string | null;
  updatedAt?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  notes?: string;
  purchaseDate?: string;
  purchaseTime?: string;
  warrantyExpires?: string;
  lifetimeWarranty?: boolean;
  archived?: boolean;
  attachments?: Attachment[];
  [key: string]: unknown;
}
export interface Page {
  items: Item[];
  total: number;
  totalPrice: number;
  page: number;
  pageSize: number;
}
export interface Session {
  token: string;
  attachmentToken: string;
  expiresAt: string;
}
export interface Stats {
  totalItems: number;
  totalItemPrice: number;
  totalLocations: number;
  totalTags: number;
  totalWithWarranty: number;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function unwrap<T>(value: T | { item: T }): T {
  return value && typeof value === "object" && "item" in value
    ? value.item
    : (value as T);
}
export function updatePayload(
  item: Item,
  changes: Record<string, unknown>,
  mode: Mode,
) {
  // PUT is a full replacement: retain every unedited business field.
  const keys = [
    "id",
    "name",
    "description",
    "quantity",
    "assetId",
    "archived",
    "fields",
    "insured",
    "lifetimeWarranty",
    "manufacturer",
    "modelNumber",
    "notes",
    "purchaseFrom",
    "purchasePrice",
    "serialNumber",
    "soldNotes",
    "soldPrice",
    "soldTo",
    "warrantyDetails",
    "warrantyExpires",
  ];
  keys.push(
    ...(mode === "entities"
      ? ["purchaseDate", "soldDate", "syncChildEntityLocations"]
      : ["purchaseTime", "soldTime", "syncChildItemsLocations"]),
  );
  const result: Record<string, unknown> = {};
  for (const key of keys) if (item[key] !== undefined) result[key] = item[key];
  result.tagIds = (item.tags || []).map((tag) => tag.id);
  result.parentId = item.parent?.id || null;
  if (mode === "entities") result.entityTypeId = item.entityType?.id || "";
  else result.locationId = item.location?.id || "";
  return { ...result, ...changes };
}
export class HomeboxApi {
  session: Session | null = null;
  tenant = "";
  constructor(
    public mode: Mode = "entities",
    private transport: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}
  get resource() {
    return this.mode === "entities" ? "/entities" : "/items";
  }
  private headersFor(options: RequestInit) {
    const headers = new Headers(options.headers);
    if (this.session) headers.set("Authorization", this.session.token);
    if (this.tenant) headers.set("X-Tenant", this.tenant);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    return headers;
  }
  private async fail(response: Response): Promise<never> {
    const data = await response.json().catch(() => null);
    const message =
      response.status === 401
        ? "Oturum sona erdi. Lütfen tekrar giriş yapın."
        : data?.error ||
          data?.message ||
          `Homebox isteği başarısız (${response.status}).`;
    throw new ApiError(response.status, String(message));
  }
  async download(path: string): Promise<Blob> {
    const response = await this.transport(`/api/v1${path}`, {
      headers: this.headersFor({}),
    });
    if (!response.ok) return this.fail(response);
    return response.blob();
  }
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = this.headersFor(options);
    const response = await this.transport(`/api/v1${path}`, {
      ...options,
      headers,
    });
    if (!response.ok) return this.fail(response);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
  async login(username: string, password: string) {
    this.session = await this.request<Session>("/users/login", {
      method: "POST",
      body: JSON.stringify({ username, password, stayLoggedIn: false }),
    });
    return this.session;
  }
  self() {
    return this.request<{ item: { name: string; email: string } }>(
      "/users/self",
    ).then(unwrap);
  }
  groups() {
    return this.request<Group[]>("/groups/all");
  }
  stats() {
    return this.request<Stats>("/groups/statistics");
  }
  tags() {
    return this.request<Organizer[]>("/tags");
  }
  types() {
    return this.mode === "entities"
      ? this.request<EntityType[]>("/entity-types")
      : Promise.resolve([]);
  }
  list(
    params: Record<
      string,
      string | number | boolean | string[] | undefined
    > = {},
  ) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (value !== undefined && value !== "") {
        for (const v of Array.isArray(value) ? value : [value])
          query.append(key, String(v));
      }
    return this.request<Page>(`${this.resource}?${query}`);
  }
  async locations(): Promise<Organizer[]> {
    if (this.mode === "legacy")
      return this.request<Organizer[]>("/locations?filterChildren=false");
    const output: Organizer[] = [];
    for (let page = 1; ; page++) {
      const result = await this.list({ isLocation: true, page, pageSize: 100 });
      output.push(...result.items);
      if (output.length >= result.total || !result.items.length) break;
    }
    return output;
  }
  item(id: string) {
    return this.request<Item>(`${this.resource}/${encodeURIComponent(id)}`);
  }
  create(body: Record<string, unknown>) {
    return this.request<Item>(this.resource, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  update(item: Item, changes: Record<string, unknown>) {
    return this.request<Item>(
      `${this.resource}/${encodeURIComponent(item.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(updatePayload(item, changes, this.mode)),
      },
    );
  }
  delete(id: string) {
    return this.request<void>(`${this.resource}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  saveOrganizer(
    kind: "locations" | "tags",
    body: Record<string, unknown>,
    existing?: Organizer,
  ) {
    const resource =
      kind === "locations" && this.mode === "entities"
        ? "/entities"
        : `/${kind}`;
    if (existing && resource === "/entities")
      return this.item(existing.id).then((item) => this.update(item, body));
    const preserved =
      kind === "tags"
        ? {
            color: existing?.color || "",
            icon: existing?.icon || "",
            parentId: existing?.parent?.id || existing?.parentId || null,
          }
        : {};
    return this.request<Organizer>(
      `${resource}${existing ? "/" + encodeURIComponent(existing.id) : ""}`,
      {
        method: existing ? "PUT" : "POST",
        body: JSON.stringify({
          ...preserved,
          ...body,
          ...(existing ? { id: existing.id } : {}),
        }),
      },
    );
  }
  async upload(itemId: string, file: File, type: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("name", file.name);
    form.append("type", type);
    return this.request<Item>(
      `${this.resource}/${encodeURIComponent(itemId)}/attachments`,
      { method: "POST", body: form },
    );
  }
  attachmentUrl(id: string, attachmentId: string) {
    const query = new URLSearchParams({
      access_token: this.session?.attachmentToken || "",
    });
    if (this.tenant) query.set("tenant", this.tenant);
    return `/api/v1${this.resource}/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}?${query}`;
  }

  // ---- Entity types -------------------------------------------------------
  typeSave(body: Record<string, unknown>, existing?: EntityType) {
    return this.request<EntityType>(
      `/entity-types${existing ? "/" + encodeURIComponent(existing.id) : ""}`,
      {
        method: existing ? "PUT" : "POST",
        body: JSON.stringify(
          existing ? { ...existing, ...body, id: existing.id } : body,
        ),
      },
    );
  }
  typeDelete(id: string) {
    return this.request<void>(`/entity-types/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  // ---- Templates (field schemas) -----------------------------------------
  templates() {
    return this.request<Template[]>("/templates");
  }
  template(id: string) {
    return this.request<Template>(`/templates/${encodeURIComponent(id)}`);
  }
  templateSave(body: Record<string, unknown>, existing?: Template) {
    return this.request<Template>(
      `/templates${existing ? "/" + encodeURIComponent(existing.id) : ""}`,
      {
        method: existing ? "PUT" : "POST",
        body: JSON.stringify(
          existing ? { ...existing, ...body, id: existing.id } : body,
        ),
      },
    );
  }
  templateDelete(id: string) {
    return this.request<void>(`/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  // ---- Users and collection ----------------------------------------------
  updateSelf(body: { name: string; email: string }) {
    return this.request<{ item: { name: string; email: string } }>(
      "/users/self",
      { method: "PUT", body: JSON.stringify(body) },
    ).then(unwrap);
  }
  changePassword(current: string, next: string) {
    return this.request<void>("/users/change-password", {
      method: "PUT",
      body: JSON.stringify({ current, new: next }),
    });
  }
  deleteSelf() {
    return this.request<void>("/users/self", { method: "DELETE" });
  }
  register(body: {
    name: string;
    email: string;
    password: string;
    token: string;
  }) {
    return this.request<void>("/users/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  group() {
    return this.request<Group>("/groups");
  }
  updateGroup(body: { name: string; currency: string }) {
    return this.request<Group>("/groups", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  invite(uses: number, expiresAt: string) {
    return this.request<Invitation>("/groups/invitations", {
      method: "POST",
      body: JSON.stringify({ uses, expiresAt }),
    });
  }
  members() {
    return this.request<Member[]>("/groups/members");
  }
  removeMember(id: string) {
    return this.request<void>(`/groups/members/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  // ---- Maintenance --------------------------------------------------------
  maintenanceList(status: "scheduled" | "completed" | "both" = "both") {
    return this.request<Maintenance[]>(`/maintenance?status=${status}`);
  }
  itemMaintenance(id: string) {
    return this.request<Maintenance[]>(
      `${this.resource}/${encodeURIComponent(id)}/maintenance`,
    );
  }
  addMaintenance(id: string, body: Record<string, unknown>) {
    return this.request<Maintenance>(
      `${this.resource}/${encodeURIComponent(id)}/maintenance`,
      { method: "POST", body: JSON.stringify(body) },
    );
  }
  saveMaintenance(id: string, body: Record<string, unknown>) {
    return this.request<Maintenance>(
      `/maintenance/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  }
  deleteMaintenance(id: string) {
    return this.request<void>(`/maintenance/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  // ---- Notifications ------------------------------------------------------
  notifiers() {
    return this.request<Notifier[]>("/notifiers");
  }
  saveNotifier(body: Record<string, unknown>, existing?: Notifier) {
    return this.request<Notifier>(
      `/notifiers${existing ? "/" + encodeURIComponent(existing.id) : ""}`,
      {
        method: existing ? "PUT" : "POST",
        body: JSON.stringify(
          existing ? { ...existing, ...body, id: existing.id } : body,
        ),
      },
    );
  }
  deleteNotifier(id: string) {
    return this.request<void>(`/notifiers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  testNotifier(url: string) {
    return this.request<void>(
      `/notifiers/test?${new URLSearchParams({ url })}`,
      { method: "POST" },
    );
  }
  // ---- Maintenance tools, import/export, labels ---------------------------
  runAction(name: string) {
    return this.request<{ completed?: number }>(
      `/actions/${encodeURIComponent(name)}`,
      { method: "POST" },
    );
  }
  /** Tries the current resource first, then the other one (0.26 vs. older). */
  async exportCsv(): Promise<Blob> {
    try {
      return await this.download(`${this.resource}/export`);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      return this.download(
        `${this.mode === "entities" ? "/items" : "/entities"}/export`,
      );
    }
  }
  async importCsv(file: File) {
    const send = (resource: string) => {
      const form = new FormData();
      form.append("csv", file);
      return this.request<{ completed?: number }>(`${resource}/import`, {
        method: "POST",
        body: form,
      });
    };
    try {
      return await send(this.resource);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      return send(this.mode === "entities" ? "/items" : "/entities");
    }
  }
  labelUrl(id: string) {
    const query = new URLSearchParams({
      access_token: this.session?.attachmentToken || "",
    });
    if (this.tenant) query.set("tenant", this.tenant);
    return `/api/v1/labelmaker/item/${encodeURIComponent(id)}?${query}`;
  }
}
