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
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (this.session) headers.set("Authorization", this.session.token);
    if (this.tenant) headers.set("X-Tenant", this.tenant);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    const response = await this.transport(`/api/v1${path}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message =
        response.status === 401
          ? "Oturum sona erdi. Lütfen tekrar giriş yapın."
          : data?.error ||
            data?.message ||
            `Homebox isteği başarısız (${response.status}).`;
      throw new ApiError(response.status, String(message));
    }
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
    return this.request<Array<{ id: string; name: string; currency: string }>>(
      "/groups/all",
    );
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
}
