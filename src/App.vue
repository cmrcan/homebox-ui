<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  LayoutGrid,
  List,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-vue-next";
import {
  ApiError,
  HomeboxApi,
  type EntityType,
  type Item,
  type Organizer,
  type Page,
  type Session,
  type Stats,
  type Mode,
} from "./api";
const api = new HomeboxApi(
  (localStorage.getItem("hb-mode") as Mode) || "entities",
);
const user = ref<{ name: string; email: string } | null>(null),
  groups = ref<Array<{ id: string; name: string; currency: string }>>([]);
const tenant = ref(sessionStorage.getItem("hb-tenant") || ""),
  currency = ref("TRY");
const demo = ref(false),
  busy = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref("");
const loginForm = reactive({ email: "", password: "", mode: api.mode });
const tab = ref("overview"),
  mobileNav = ref(false),
  view = ref("grid"),
  search = ref(""),
  locationFilter = ref(""),
  tagFilter = ref(""),
  archived = ref(false),
  page = ref(1);
const locations = ref<Organizer[]>([]),
  tags = ref<Organizer[]>([]),
  types = ref<EntityType[]>([]);
const result = ref<Page>({
  items: [],
  total: 0,
  totalPrice: 0,
  page: 1,
  pageSize: 12,
});
const stats = ref<Stats>({
  totalItems: 0,
  totalItemPrice: 0,
  totalLocations: 0,
  totalTags: 0,
  totalWithWarranty: 0,
});
const selected = ref<Item | null>(null),
  modal = ref<"detail" | "edit" | "organizer" | null>(null),
  dialog = ref<HTMLDialogElement | null>(null);
const organizerKind = ref<"locations" | "tags">("locations"),
  organizer = ref<Organizer | null>(null);
const organizerForm = reactive({
  name: "",
  description: "",
  entityTypeId: "",
  parentId: "",
});
const form = reactive({
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
});
const uploadType = ref("photo"),
  deleteConfirm = ref(false);
const dark = ref(localStorage.getItem("hb-theme") === "dark");
const nav = [
  { id: "overview", name: "Genel bakış", icon: LayoutDashboard },
  { id: "inventory", name: "Envanterim", icon: Package },
  { id: "locations", name: "Konumlar", icon: MapPin },
  { id: "tags", name: "Etiketler", icon: Tag },
];
const title = computed(
  () => nav.find((n) => n.id === tab.value)?.name || "Genel bakış",
);
const isAuthenticated = computed(() => !!user.value || demo.value);
const currentGroup = computed(() =>
  groups.value.find((g) => g.id === tenant.value),
);
const currentOrganizers = computed(() =>
  tab.value === "locations" ? locations.value : tags.value,
);
const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency.value,
    maximumFractionDigits: 0,
  }).format(n || 0);
const date = (s: unknown) =>
  typeof s === "string" && s && !s.startsWith("0001")
    ? new Date(s).toLocaleDateString("tr-TR")
    : "—";
const initials = computed(() =>
  (user.value?.name || "Demo Kullanıcı")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase(),
);
const dateOnly = (s: unknown) =>
  typeof s === "string" && !s.startsWith("0001") ? s.slice(0, 10) : "";
function setTheme() {
  document.documentElement.classList.toggle("dark", dark.value);
  localStorage.setItem("hb-theme", dark.value ? "dark" : "light");
}
watch(dark, setTheme);
function handleError(e: unknown) {
  error.value = e instanceof Error ? e.message : String(e);
  if (e instanceof ApiError && e.status === 401) {
    user.value = null;
    api.session = null;
    sessionStorage.removeItem("hb-session");
    close();
  }
}
function flash(message: string) {
  notice.value = message;
  setTimeout(() => (notice.value = ""), 4500);
}
function close() {
  dialog.value?.close();
  modal.value = null;
  deleteConfirm.value = false;
}
async function show(kind: typeof modal.value) {
  modal.value = kind;
  await nextTick();
  dialog.value?.showModal();
}
let loadVersion = 0;
async function loadItems() {
  if (!isAuthenticated.value) return;
  const version = ++loadVersion;
  busy.value = true;
  error.value = "";
  try {
    if (demo.value) {
      const list = demoItems.value.filter(
        (i) =>
          (!search.value ||
            (i.name + " " + i.description)
              .toLocaleLowerCase("tr")
              .includes(search.value.toLocaleLowerCase("tr"))) &&
          (!locationFilter.value || i.location?.id === locationFilter.value) &&
          (!tagFilter.value || i.tags.some((t) => t.id === tagFilter.value)) &&
          (archived.value || !i.archived),
      );
      result.value = {
        items: list.slice((page.value - 1) * 12, page.value * 12),
        total: list.length,
        totalPrice: list.reduce(
          (sum, i) => sum + i.purchasePrice * i.quantity,
          0,
        ),
        page: page.value,
        pageSize: 12,
      };
    } else {
      const data = await api.list({
        page: page.value,
        pageSize: 12,
        q: search.value,
        includeArchived: archived.value,
        orderBy: "updatedAt",
        ...(api.mode === "entities"
          ? {
              isLocation: false,
              parentIds: locationFilter.value
                ? [locationFilter.value]
                : undefined,
            }
          : {
              locations: locationFilter.value
                ? [locationFilter.value]
                : undefined,
            }),
        tags: tagFilter.value ? [tagFilter.value] : undefined,
      });
      if (version === loadVersion) result.value = data;
    }
  } catch (e) {
    if (version === loadVersion) handleError(e);
  } finally {
    if (version === loadVersion) busy.value = false;
  }
}
async function refresh() {
  if (demo.value) {
    stats.value = {
      totalItems: demoItems.value.length,
      totalItemPrice: demoItems.value.reduce(
        (s, i) => s + i.purchasePrice * i.quantity,
        0,
      ),
      totalLocations: locations.value.length,
      totalTags: tags.value.length,
      totalWithWarranty: 2,
    };
    return loadItems();
  }
  busy.value = true;
  error.value = "";
  try {
    const data = await Promise.all([
      api.locations(),
      api.tags(),
      api.types(),
      api.stats(),
    ]);
    locations.value = data[0];
    tags.value = data[1];
    types.value = data[2];
    stats.value = data[3];
    await loadItems();
  } catch (e) {
    handleError(e);
  } finally {
    busy.value = false;
  }
}
async function establish() {
  user.value = await api.self();
  groups.value = await api.groups();
  if (!groups.value.some((g) => g.id === tenant.value))
    tenant.value = groups.value[0]?.id || "";
  api.tenant = tenant.value;
  currency.value = currentGroup.value?.currency || "TRY";
  sessionStorage.setItem("hb-tenant", tenant.value);
  await refresh();
}
async function login() {
  busy.value = true;
  error.value = "";
  api.mode = loginForm.mode;
  localStorage.setItem("hb-mode", api.mode);
  try {
    const session = await api.login(loginForm.email, loginForm.password);
    sessionStorage.setItem("hb-session", JSON.stringify(session));
    loginForm.password = "";
    await establish();
  } catch (e) {
    handleError(e);
  } finally {
    busy.value = false;
  }
}
async function logout() {
  if (!demo.value) {
    try {
      await api.request("/users/logout", { method: "POST" });
    } catch (e) {
      handleError(e);
    }
  }
  demo.value = false;
  user.value = null;
  api.session = null;
  api.tenant = "";
  sessionStorage.removeItem("hb-session");
  sessionStorage.removeItem("hb-tenant");
  close();
  result.value.items = [];
}
async function changeGroup() {
  api.tenant = tenant.value;
  sessionStorage.setItem("hb-tenant", tenant.value);
  currency.value = currentGroup.value?.currency || "TRY";
  page.value = 1;
  locationFilter.value = "";
  tagFilter.value = "";
  close();
  await refresh();
}
function navigate(id: string) {
  tab.value = id;
  mobileNav.value = false;
  page.value = 1;
  search.value = "";
  locationFilter.value = "";
  tagFilter.value = "";
  window.location.hash = id;
}
function filterOrganizer(kind: string, id: string) {
  navigate("inventory");
  if (kind === "locations") locationFilter.value = id;
  else tagFilter.value = id;
}
function keyboard(event: KeyboardEvent) {
  if (
    event.key === "/" &&
    !modal.value &&
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLTextAreaElement) &&
    !(event.target instanceof HTMLSelectElement)
  ) {
    event.preventDefault();
    document
      .querySelector<HTMLInputElement>('input[aria-label="Envanterde ara"]')
      ?.focus();
  }
}
onMounted(() => window.addEventListener("keydown", keyboard));
onUnmounted(() => {
  window.removeEventListener("keydown", keyboard);
  clearTimeout(timer);
});
let timer: ReturnType<typeof setTimeout>;
watch([search, locationFilter, tagFilter, archived], () => {
  page.value = 1;
  clearTimeout(timer);
  timer = setTimeout(loadItems, 250);
});
watch(page, loadItems);
async function openItem(item: Item) {
  error.value = "";
  saving.value = true;
  try {
    selected.value = demo.value
      ? JSON.parse(JSON.stringify(item))
      : await api.item(item.id);
    await show("detail");
  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
  }
}
async function edit(item: Item | null = null) {
  selected.value = item;
  Object.assign(form, {
    name: item?.name || "",
    description: item?.description || "",
    quantity: item?.quantity ?? 1,
    locationId: item?.location?.id || locations.value[0]?.id || "",
    parentId: item?.parent?.id || "",
    entityTypeId:
      item?.entityType?.id || types.value.find((t) => !t.isLocation)?.id || "",
    tagIds: (item?.tags || []).map((t) => t.id),
    purchasePrice: item?.purchasePrice || 0,
    manufacturer: item?.manufacturer || "",
    modelNumber: item?.modelNumber || "",
    serialNumber: item?.serialNumber || "",
    purchaseDate: dateOnly(item?.purchaseDate || item?.purchaseTime),
    warrantyExpires: dateOnly(item?.warrantyExpires),
    notes: item?.notes || "",
    archived: item?.archived || false,
  });
  await show("edit");
}
async function saveItem() {
  saving.value = true;
  error.value = "";
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
      warrantyExpires: form.warrantyExpires || "0001-01-01",
      ...(api.mode === "entities"
        ? { purchaseDate: form.purchaseDate || "0001-01-01" }
        : { purchaseTime: form.purchaseDate || "0001-01-01" }),
    };
    if (demo.value) {
      const id = selected.value?.id || crypto.randomUUID();
      const item = {
        ...selected.value,
        ...changes,
        id,
        tags: tags.value.filter((t) => form.tagIds.includes(t.id)),
        location:
          locations.value.find(
            (l) =>
              l.id ===
              (api.mode === "entities" ? form.parentId : form.locationId),
          ) || null,
        updatedAt: new Date().toISOString(),
      } as Item;
      demoItems.value = demoItems.value.filter((i) => i.id !== id);
      demoItems.value.unshift(item);
      close();
      await refresh();
      flash("Demo envanteri güncellendi.");
    } else {
      let item: Item;
      if (selected.value) item = await api.update(selected.value, changes);
      else {
        item = await api.create(base);
        selected.value = item;
        try {
          item = await api.update(item, changes);
        } catch (e) {
          await show("edit");
          throw new Error(
            `Ürün oluşturuldu; ek bilgiler kaydedilemedi. Formu tekrar kaydedebilirsiniz. ${e instanceof Error ? e.message : ""}`,
          );
        }
      }
      selected.value = item;
      await show("detail");
      await refresh();
      flash("Ürün kaydedildi.");
    }
  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
  }
}
async function removeItem() {
  if (!selected.value) return;
  saving.value = true;
  try {
    if (demo.value)
      demoItems.value = demoItems.value.filter(
        (i) => i.id !== selected.value?.id,
      );
    else await api.delete(selected.value.id);
    close();
    await refresh();
    flash("Ürün silindi.");
  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
  }
}
async function openOrganizer(
  kind: "locations" | "tags",
  existing: Organizer | null = null,
) {
  organizerKind.value = kind;
  organizer.value = existing;
  Object.assign(organizerForm, {
    name: existing?.name || "",
    description: existing?.description || "",
    entityTypeId:
      existing?.entityType?.id ||
      types.value.find((t) => t.isLocation)?.id ||
      "",
    parentId: existing?.parent?.id || "",
  });
  await show("organizer");
}
async function saveOrganizer() {
  saving.value = true;
  try {
    const body = {
      name: organizerForm.name.trim(),
      description: organizerForm.description,
      ...(organizerKind.value === "locations"
        ? {
            parentId: organizerForm.parentId || null,
            ...(api.mode === "entities"
              ? {
                  entityTypeId: organizerForm.entityTypeId,
                  ...(!organizer.value ? { quantity: 1, tagIds: [] } : {}),
                }
              : {}),
          }
        : {}),
    };
    if (demo.value) {
      const arr = organizerKind.value === "locations" ? locations : tags;
      const value = {
        ...organizer.value,
        ...body,
        id: organizer.value?.id || crypto.randomUUID(),
      };
      arr.value = arr.value.filter((i) => i.id !== value.id);
      arr.value.push(value);
    } else
      await api.saveOrganizer(
        organizerKind.value,
        body,
        organizer.value || undefined,
      );
    close();
    await refresh();
    flash("Kaydedildi.");
  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
  }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !selected.value) return;
  if (demo.value) {
    flash("Dosya yükleme için kendi Homebox hesabına giriş yap.");
    input.value = "";
    return;
  }
  saving.value = true;
  try {
    await api.upload(selected.value.id, file, uploadType.value);
    selected.value = await api.item(selected.value.id);
    await loadItems();
    flash("Dosya yüklendi.");
  } catch (e) {
    handleError(e);
  } finally {
    saving.value = false;
    input.value = "";
  }
}
function photo(item: Item) {
  const id = item.thumbnailId || item.imageId;
  return id ? api.attachmentUrl(item.id, id) : "";
}
const demoItems = ref<Item[]>([]);
function startDemo() {
  demo.value = true;
  error.value = "";
  currency.value = "TRY";
  locations.value = [
    {
      id: "living",
      name: "Salon",
      description: "Günlük yaşam alanı",
      itemCount: 2,
    },
    {
      id: "kitchen",
      name: "Mutfak",
      description: "Kahve, yemek ve küçük aletler",
      itemCount: 2,
    },
    {
      id: "office",
      name: "Çalışma odası",
      description: "Teknoloji ve çalışma ekipmanları",
      itemCount: 3,
    },
  ];
  tags.value = [
    { id: "tech", name: "Teknoloji" },
    { id: "appliance", name: "Ev aletleri" },
    { id: "audio", name: "Ses & müzik" },
  ];
  types.value = [
    { id: "item", name: "Ürün", isLocation: false },
    { id: "location", name: "Konum", isLocation: true },
  ];
  const data = [
    [
      "Siemens EQ700",
      "Tam otomatik kahve makinesi",
      "kitchen",
      42500,
      "appliance",
      "Siemens",
      "TP715R01",
    ],
    [
      "UniFi Gateway Max",
      "Ev ağının merkezi",
      "office",
      10500,
      "tech",
      "Ubiquiti",
      "UCG-Max",
    ],
    [
      "Yale Linus L2",
      "Akıllı kapı kilidi",
      "living",
      12500,
      "tech",
      "Yale",
      "Linus L2",
    ],
    [
      "Lenovo ThinkCentre",
      "Ev sunucusu ve Home Assistant",
      "office",
      7500,
      "tech",
      "Lenovo",
      "M720Q",
    ],
    [
      "Apple HomePod mini",
      "Müzik ve akıllı ev",
      "living",
      4800,
      "audio",
      "Apple",
      "HomePod mini",
    ],
    [
      "Bosch Serie 6",
      "Bulaşık makinesi",
      "kitchen",
      28500,
      "appliance",
      "Bosch",
      "Serie 6",
    ],
    [
      "SteelSeries Arctis Nova 7",
      "Kablosuz kulaklık",
      "office",
      6900,
      "audio",
      "SteelSeries",
      "Nova 7",
    ],
  ];
  demoItems.value = data.map(
    ([name, description, loc, price, tag, manufacturer, modelNumber], i) => ({
      id: String(i),
      name: String(name),
      description: String(description),
      quantity: 1,
      purchasePrice: Number(price),
      tags: tags.value.filter((t) => t.id === tag),
      location: locations.value.find((l) => l.id === loc),
      parent: locations.value.find((l) => l.id === loc),
      entityType: types.value[0],
      manufacturer: String(manufacturer),
      modelNumber: String(modelNumber),
      updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
      attachments: [],
      fields: [],
    }),
  );
  refresh();
}
onMounted(async () => {
  setTheme();
  const hash = window.location.hash.slice(1);
  if (nav.some((n) => n.id === hash)) tab.value = hash;
  const stored = sessionStorage.getItem("hb-session");
  if (stored) {
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
});
</script>

<template>
  <div v-if="!isAuthenticated" class="login-page">
    <div class="login-story">
      <div class="brand text-white">
        <span class="brand-icon"><Box :size="26" /></span> homebox<span
          class="brand-dot"
          >.</span
        >
      </div>
      <div>
        <span class="eyebrow text-emerald-200"
          >EVİNDEKİ HER ŞEY, BİR ARADA</span
        >
        <h1>
          Evim.<br />Eşyalarım.<br /><span class="text-emerald-200"
            >Düzenim.</span
          >
        </h1>
        <p>
          Eşyalarının nerede olduğunu, ne zaman alındığını ve değerini bil.
          Evinin hafızası burada.
        </p>
      </div>
      <div class="text-sm text-emerald-100/70">
        Senin evin. Senin verilerin.
      </div>
    </div>
    <main class="login-form">
      <div class="w-full max-w-sm">
        <span class="eyebrow">HOMEBOX ENVANTER</span>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight">
          Evine hoş geldin.
        </h2>
        <p class="mt-3 mb-8 text-muted">
          Homebox hesabınla giriş yap ve kaldığın yerden devam et.
        </p>
        <form @submit.prevent="login" class="space-y-5">
          <label class="field"
            >E-posta<input
              v-model="loginForm.email"
              type="email"
              autocomplete="username"
              required
              placeholder="sen@evin.com" /></label
          ><label class="field"
            >Şifre<input
              v-model="loginForm.password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="Şifren"
          /></label>
          <details class="text-sm text-muted">
            <summary class="cursor-pointer">Bağlantı seçenekleri</summary>
            <label class="field mt-3"
              >Homebox API sürümü<select v-model="loginForm.mode">
                <option value="entities">Homebox 0.26.2 · Entities</option>
                <option value="legacy">Eski sürümler · Items</option>
              </select></label
            >
          </details>
          <div v-if="error" role="alert" class="error">{{ error }}</div>
          <button
            type="submit"
            class="button-primary w-full justify-center"
            :disabled="busy"
          >
            <LoaderCircle v-if="busy" class="animate-spin" :size="18" />{{
              busy ? "Bağlanıyor…" : "Giriş yap"
            }}<ArrowUpRight :size="18" />
          </button>
        </form>
        <div class="mt-7 border-t border-line pt-6 text-center">
          <button
            class="text-sm font-medium text-brand hover:underline"
            @click="startDemo"
          >
            Örnek envanterle arayüzü keşfet
          </button>
          <p class="text-xs text-muted mt-2">
            Demo verileri yalnızca bu tarayıcı oturumunda kullanılır.
          </p>
        </div>
      </div>
    </main>
  </div>
  <div v-else class="app-shell">
    <button
      v-if="mobileNav"
      class="fixed inset-0 z-30 bg-black/30 lg:hidden"
      aria-label="Menüyü kapat"
      @click="mobileNav = false"
    ></button>
    <aside class="sidebar" :class="{ 'sidebar-open': mobileNav }">
      <a href="#overview" @click.prevent="navigate('overview')" class="brand"
        ><span class="brand-icon"><Box :size="25" /></span>homebox<span
          class="brand-dot"
          >.</span
        ></a
      >
      <div class="workspace">
        <div class="workspace-avatar"><Home :size="19" /></div>
        <div class="min-w-0 flex-1">
          <span class="eyebrow !text-[9px]">KİŞİSEL ALANIN</span
          ><select
            v-if="groups.length > 1"
            v-model="tenant"
            :disabled="busy"
            @change="changeGroup"
            class="!border-0 !p-0 !bg-transparent !text-sm !font-semibold"
          >
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
          <p v-else class="font-semibold text-sm truncate">
            {{ currentGroup?.name || "Benim evim" }}
          </p>
        </div>
        <ShieldCheck :size="15" class="text-brand" />
      </div>
      <p class="nav-caption">KOLEKSİYON</p>
      <nav class="space-y-1">
        <button
          v-for="n in nav"
          :key="n.id"
          @click="navigate(n.id)"
          class="nav-item"
          :class="{ 'nav-active': tab === n.id }"
        >
          <component :is="n.icon" :size="19" /><span>{{ n.name }}</span
          ><span v-if="n.id === 'inventory'" class="nav-count">{{
            stats.totalItems
          }}</span>
        </button>
      </nav>
      <div class="sidebar-note">
        <div class="flex gap-2 items-center text-brand mb-2">
          <ShieldCheck :size="17" /><span class="text-xs font-semibold"
            >Evinin dijital hafızası</span
          >
        </div>
        <p>
          Eşyalar, belgeler ve önemli bilgiler. Hepsi kendi Homebox sunucunda.
        </p>
      </div>
      <div class="mt-auto">
        <button @click="dark = !dark" class="nav-item">
          <Sun v-if="dark" :size="18" /><Moon v-else :size="18" />{{
            dark ? "Açık görünüm" : "Koyu görünüm"
          }}</button
        ><a
          href="https://homebox.software"
          target="_blank"
          rel="noopener noreferrer"
          class="nav-item"
          ><CircleHelp :size="18" />Homebox rehberi<ArrowUpRight
            :size="14"
            class="ml-auto"
        /></a>
        <div class="user-row">
          <div class="avatar">{{ initials }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">
              {{ user?.name || "Demo Kullanıcı" }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ user?.email || "Örnek envanter" }}
            </p>
          </div>
          <button @click="logout" class="icon-button" aria-label="Çıkış yap">
            <LogOut :size="17" />
          </button>
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="flex items-center gap-3">
          <button
            @click="mobileNav = true"
            class="icon-button mobile-menu-button lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu :size="21" /></button
          ><span class="text-muted text-sm">Benim evim</span
          ><ChevronRight :size="14" class="text-muted" /><span
            class="text-sm font-medium"
            >{{ title }}</span
          >
        </div>
        <div class="flex gap-3 items-center">
          <span class="status-pill"
            ><span></span>{{ demo ? "Demo modu" : "Homebox bağlantısı" }}</span
          ><button
            @click="refresh"
            class="icon-button"
            aria-label="Verileri yenile"
          >
            <ArrowDownLeft :size="18" :class="{ 'animate-pulse': busy }" />
          </button>
          <div class="avatar !w-8 !h-8 !text-xs">{{ initials }}</div>
        </div>
      </header>
      <main class="content">
        <div v-if="demo" class="demo-banner">
          <span
            >Örnek envanteri keşfediyorsun. Değişiklikler Homebox sunucuna
            gönderilmez.</span
          ><button @click="logout">
            Hesabımla giriş yap <ArrowUpRight :size="15" />
          </button>
        </div>
        <div v-if="error && !modal" role="alert" class="error mb-6">
          {{ error }}
        </div>
        <section class="page-heading">
          <div>
            <div class="eyebrow mb-3">
              {{
                tab === "overview"
                  ? "HER ŞEY YERLİ YERİNDE"
                  : "EVİNİN DİJİTAL ENVANTERİ"
              }}
            </div>
            <h1>{{ tab === "overview" ? "Evine bir bakış." : title }}</h1>
            <p>
              {{
                tab === "overview"
                  ? "Sahip olduklarını tanı. İhtiyacın olanı kolayca bul."
                  : tab === "inventory"
                    ? "Her eşyanın bir yeri, her bilginin bir kaydı var."
                    : tab === "locations"
                      ? "Odalar, dolaplar ve saklama alanların."
                      : "Eşyalarını senin için anlamlı gruplarda topla."
              }}
            </p>
          </div>
          <button
            v-if="tab === 'overview' || tab === 'inventory'"
            @click="edit()"
            class="button-primary"
            :disabled="busy || saving"
          >
            <Plus :size="18" />Ürün ekle</button
          ><button
            v-else
            @click="openOrganizer(tab as 'locations' | 'tags')"
            class="button-primary"
            :disabled="busy || saving"
          >
            <Plus :size="18" />{{
              tab === "locations" ? "Konum ekle" : "Etiket ekle"
            }}
          </button>
        </section>
        <section v-if="tab === 'overview'" class="stats-grid">
          <article
            v-for="(s, i) in [
              {
                label: 'Toplam ürün',
                value: stats.totalItems,
                icon: Package,
                note: 'Envanterindeki ürün kayıtları',
              },
              {
                label: 'Toplam değer',
                value: money(stats.totalItemPrice),
                icon: ArrowUpRight,
                note: 'Homebox satın alma toplamı',
              },
              {
                label: 'Konumlar',
                value: stats.totalLocations,
                icon: MapPin,
                note: 'Her şeyin kendine ait bir yeri var',
              },
              {
                label: 'Garantili ürün',
                value: stats.totalWithWarranty,
                icon: ShieldCheck,
                note: 'Homebox garanti kaydı olan ürünler',
              },
            ]"
            :key="i"
            class="stat-card"
          >
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted">{{ s.label }}</span
              ><span class="stat-icon"
                ><component :is="s.icon" :size="18"
              /></span>
            </div>
            <p class="stat-value">{{ s.value }}</p>
            <p class="text-xs text-muted">{{ s.note }}</p>
          </article>
        </section>
        <section v-if="tab === 'overview'" class="locations-strip">
          <div class="section-header">
            <div>
              <h2>Evindeki alanlar</h2>
              <p>Bir konum seç, içindekileri keşfet.</p>
            </div>
            <button @click="navigate('locations')" class="text-action">
              Tüm konumlar<ArrowUpRight :size="16" />
            </button>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-1">
            <button
              v-for="l in locations.slice(0, 6)"
              :key="l.id"
              class="location-chip"
              @click="
                navigate('inventory');
                locationFilter = l.id;
              "
            >
              <span class="location-chip-icon"><MapPin :size="20" /></span
              ><span class="text-left"
                ><strong>{{ l.name }}</strong
                ><small>{{
                  l.itemCount === undefined
                    ? "Konumu keşfet"
                    : l.itemCount + " ürün"
                }}</small></span
              ><ChevronRight :size="15" class="text-muted ml-auto" /></button
            ><button
              v-if="!locations.length"
              class="location-chip"
              @click="openOrganizer('locations')"
            >
              <Plus :size="20" />İlk konumunu ekle
            </button>
          </div>
        </section>
        <section
          v-if="tab === 'overview' || tab === 'inventory'"
          class="inventory-section"
        >
          <div class="section-header">
            <div>
              <h2>
                {{ tab === "overview" ? "Envanterin" : "Tüm ürünler"
                }}<span class="heading-count">{{ result.total }}</span>
              </h2>
              <p>
                {{
                  tab === "overview"
                    ? "Eşyaların ve onlara ait tüm bilgiler."
                    : "Ara, filtrele, kolayca bul."
                }}
              </p>
            </div>
            <div class="view-toggle">
              <button
                @click="view = 'grid'"
                :class="{ active: view === 'grid' }"
                aria-label="Kart görünümü"
                :aria-pressed="view === 'grid'"
              >
                <LayoutGrid :size="17" /></button
              ><button
                @click="view = 'list'"
                :class="{ active: view === 'list' }"
                aria-label="Liste görünümü"
                :aria-pressed="view === 'list'"
              >
                <List :size="19" />
              </button>
            </div>
          </div>
          <div class="filter-bar">
            <label class="search-field"
              ><Search :size="18" /><input
                v-model="search"
                aria-label="Envanterde ara"
                placeholder="Bir eşya, marka veya açıklama ara…"
              /><kbd>/</kbd></label
            ><select v-model="locationFilter" aria-label="Konuma göre filtrele">
              <option value="">Tüm konumlar</option>
              <option v-for="l in locations" :value="l.id" :key="l.id">
                {{ l.name }}
              </option></select
            ><select v-model="tagFilter" aria-label="Etikete göre filtrele">
              <option value="">Tüm etiketler</option>
              <option v-for="t in tags" :value="t.id" :key="t.id">
                {{ t.name }}
              </option></select
            ><label class="archive-toggle" title="Arşivlenen ürünleri dahil et"
              ><input type="checkbox" v-model="archived" /><Archive
                :size="16"
              /><span>Arşiv</span></label
            >
          </div>
          <div v-if="busy" class="loading" role="status">
            <LoaderCircle :size="23" class="animate-spin" />Envanter yükleniyor…
          </div>
          <div v-else-if="!result.items.length" class="empty-state">
            <span class="empty-icon"><Package :size="34" /></span>
            <h3>
              {{
                search || locationFilter || tagFilter
                  ? "Eşleşen ürün bulunamadı"
                  : "Evinin hikâyesini kaydetmeye başla"
              }}
            </h3>
            <p>
              {{
                search || locationFilter || tagFilter
                  ? "Farklı bir arama veya filtre deneyebilirsin."
                  : "İlk eşyanı ekle; fotoğrafı, belgeleri ve bilgileri hep elinin altında olsun."
              }}
            </p>
            <button
              v-if="search || locationFilter || tagFilter"
              class="button-secondary"
              @click="
                search = '';
                locationFilter = '';
                tagFilter = '';
              "
            >
              Filtreleri temizle</button
            ><button v-else class="button-primary" @click="edit()">
              <Plus :size="17" />İlk ürününü ekle
            </button>
          </div>
          <div v-else-if="view === 'grid'" class="items-grid">
            <button
              v-for="(item, index) in result.items"
              :key="item.id"
              class="item-card"
              @click="openItem(item)"
            >
              <div class="item-visual" :class="'visual-' + (index % 4)">
                <img
                  v-if="photo(item)"
                  :src="photo(item)"
                  :alt="item.name"
                  loading="lazy"
                />
                <div v-else class="item-placeholder">
                  <Box :size="53" :stroke-width="1" /><span>{{
                    item.manufacturer || "HOMEBOX"
                  }}</span>
                </div>
                <span v-if="item.archived" class="item-archived">Arşiv</span
                ><span class="item-location"
                  ><MapPin :size="11" />{{
                    item.location?.name || item.parent?.name || "Konum yok"
                  }}</span
                >
              </div>
              <div class="item-body">
                <div class="flex justify-between items-start gap-2">
                  <h3>{{ item.name }}</h3>
                  <ArrowUpRight :size="16" class="text-muted shrink-0 mt-1" />
                </div>
                <p class="item-description">
                  {{ item.description || "Açıklama eklenmemiş" }}
                </p>
                <div class="item-tags">
                  <span v-for="t in item.tags.slice(0, 2)" :key="t.id">{{
                    t.name
                  }}</span
                  ><span v-if="item.tags.length > 2"
                    >+{{ item.tags.length - 2 }}</span
                  >
                </div>
                <div class="item-footer">
                  <strong>{{ money(item.purchasePrice) }}</strong
                  ><span>{{ item.quantity }} adet</span>
                </div>
              </div>
            </button>
          </div>
          <div v-else class="table-scroll">
            <table class="item-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Konum</th>
                  <th>Etiket</th>
                  <th>Adet</th>
                  <th>Satın alma değeri</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in result.items" :key="item.id">
                  <td>
                    <button @click="openItem(item)" class="table-item">
                      <span class="table-icon"><Package :size="21" /></span
                      ><span
                        ><strong>{{ item.name }}</strong
                        ><small>{{ item.description }}</small></span
                      >
                    </button>
                  </td>
                  <td>{{ item.location?.name || item.parent?.name || "—" }}</td>
                  <td>{{ item.tags.map((t) => t.name).join(", ") || "—" }}</td>
                  <td>{{ item.quantity }}</td>
                  <td class="font-semibold">{{ money(item.purchasePrice) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="result.total" class="pagination">
            <span
              >{{ (page - 1) * 12 + 1 }}–{{
                Math.min(page * 12, result.total)
              }}
              / {{ result.total }} ürün</span
            >
            <div class="flex items-center gap-3">
              <button
                class="icon-button"
                @click="page--"
                :disabled="page === 1"
                aria-label="Önceki sayfa"
              >
                <ChevronLeft :size="18" /></button
              ><span>Sayfa {{ page }}</span
              ><button
                class="icon-button"
                @click="page++"
                :disabled="page * 12 >= result.total"
                aria-label="Sonraki sayfa"
              >
                <ChevronRight :size="18" />
              </button>
            </div>
          </div>
        </section>
        <section v-else class="organizers-grid">
          <article
            v-for="o in currentOrganizers"
            :key="o.id"
            class="organizer-card"
          >
            <span class="organizer-icon"
              ><MapPin v-if="tab === 'locations'" :size="27" /><Tag
                v-else
                :size="27"
            /></span>
            <h2>{{ o.name }}</h2>
            <p>{{ o.description || "Kendi düzeninin bir parçası." }}</p>
            <div class="flex justify-between items-center mt-7">
              <button class="text-action" @click="filterOrganizer(tab, o.id)">
                Ürünleri gör<ArrowUpRight :size="15" /></button
              ><button
                class="icon-button"
                :aria-label="o.name + ' düzenle'"
                @click="openOrganizer(tab as 'locations' | 'tags', o)"
              >
                <Settings2 :size="17" />
              </button>
            </div>
          </article>
          <button
            @click="openOrganizer(tab as 'locations' | 'tags')"
            class="add-organizer"
          >
            <Plus :size="27" />{{
              tab === "locations" ? "Yeni konum" : "Yeni etiket"
            }}
          </button>
        </section>
        <footer class="page-footer">
          <span
            >homebox<span class="text-brand">.</span>
            <span class="ml-2">Bir ev dolusu düzen.</span></span
          ><a
            href="https://github.com/sysadminsmedia/homebox"
            target="_blank"
            rel="noopener noreferrer"
            >Homebox API ile çalışır<ArrowUpRight :size="12"
          /></a>
        </footer>
      </main>
    </div>
  </div>
  <dialog
    v-if="modal"
    ref="dialog"
    class="modal"
    aria-labelledby="modal-title"
    @cancel.prevent="close"
  >
    <div class="modal-header">
      <div>
        <span class="eyebrow">{{
          modal === "detail"
            ? "ÜRÜN BİLGİLERİ"
            : modal === "organizer"
              ? "EVİNİN DÜZENİ"
              : "ENVANTER KAYDI"
        }}</span>
        <h2 id="modal-title">
          {{
            modal === "detail"
              ? selected?.name
              : modal === "edit"
                ? selected
                  ? "Ürünü düzenle"
                  : "Yeni bir ürün"
                : organizerKind === "locations"
                  ? "Konum bilgileri"
                  : "Etiket bilgileri"
          }}
        </h2>
      </div>
      <button @click="close" class="icon-button" aria-label="Pencereyi kapat">
        <X :size="21" />
      </button>
    </div>
    <div v-if="error" role="alert" class="error mx-7 mb-3">{{ error }}</div>
    <div v-if="modal === 'detail' && selected" class="modal-content">
      <img
        v-if="photo(selected)"
        :src="photo(selected)"
        :alt="selected.name"
        class="detail-image"
      />
      <p class="text-muted mb-5">
        {{ selected.description || "Açıklama eklenmemiş." }}
      </p>
      <div class="detail-grid">
        <div>
          <small>Konum</small
          ><strong>{{
            selected.location?.name || selected.parent?.name || "—"
          }}</strong>
        </div>
        <div>
          <small>Satın alma değeri</small
          ><strong>{{ money(selected.purchasePrice) }}</strong>
        </div>
        <div>
          <small>Marka / Model</small
          ><strong>{{
            [selected.manufacturer, selected.modelNumber]
              .filter(Boolean)
              .join(" / ") || "—"
          }}</strong>
        </div>
        <div>
          <small>Seri numarası</small
          ><strong>{{ selected.serialNumber || "—" }}</strong>
        </div>
        <div>
          <small>Satın alma tarihi</small
          ><strong>{{
            date(selected.purchaseDate || selected.purchaseTime)
          }}</strong>
        </div>
        <div>
          <small>Garanti bitişi</small
          ><strong>{{
            selected.lifetimeWarranty
              ? "Ömür boyu"
              : date(selected.warrantyExpires)
          }}</strong>
        </div>
        <div>
          <small>Adet</small><strong>{{ selected.quantity }}</strong>
        </div>
        <div>
          <small>Etiketler</small
          ><strong>{{
            selected.tags.map((t) => t.name).join(", ") || "—"
          }}</strong>
        </div>
      </div>
      <div v-if="selected.notes" class="mt-6">
        <h3 class="font-semibold mb-2">Notlar</h3>
        <p class="text-muted whitespace-pre-wrap text-sm">
          {{ selected.notes }}
        </p>
      </div>
      <section class="attachment-section">
        <h3>Fotoğraflar & belgeler</h3>
        <a
          v-for="a in selected.attachments || []"
          :key="a.id"
          :href="api.attachmentUrl(selected.id, a.id)"
          target="_blank"
          rel="noopener noreferrer"
          class="attachment-link"
          ><FileText :size="17" /><span>{{ a.title || a.id }}</span
          ><ArrowUpRight :size="15"
        /></a>
        <div class="flex gap-2 mt-4">
          <select v-model="uploadType" aria-label="Dosya türü">
            <option value="photo">Fotoğraf</option>
            <option value="receipt">Fatura</option>
            <option value="warranty">Garanti</option>
            <option value="manual">Kılavuz</option>
            <option value="attachment">Diğer belge</option></select
          ><label class="button-secondary cursor-pointer"
            ><Upload :size="16" />Dosya yükle<input
              type="file"
              class="sr-only"
              @change="upload"
              :disabled="saving"
          /></label>
        </div>
      </section>
      <div class="modal-actions">
        <button
          v-if="!deleteConfirm"
          @click="deleteConfirm = true"
          class="button-danger"
        >
          <Trash2 :size="16" />Sil
        </button>
        <div v-else class="flex flex-wrap gap-2 items-center text-sm">
          <span>Kalıcı olarak silinsin mi?</span
          ><button @click="removeItem" class="button-danger" :disabled="saving">
            Evet, sil</button
          ><button @click="deleteConfirm = false" class="button-secondary">
            Vazgeç
          </button>
        </div>
        <button
          @click="edit(selected)"
          class="button-primary"
          :disabled="saving"
        >
          <LoaderCircle
            v-if="saving"
            :size="16"
            class="animate-spin"
          /><Settings2 v-else :size="16" />Düzenle
        </button>
      </div>
    </div>
    <form
      v-else-if="modal === 'edit'"
      @submit.prevent="saveItem"
      class="modal-content"
    >
      <div class="form-grid">
        <label class="field col-span-2"
          >Ürün adı<input
            v-model="form.name"
            required
            maxlength="255"
            placeholder="Örn. Siemens kahve makinesi" /></label
        ><label class="field col-span-2"
          >Açıklama<textarea
            v-model="form.description"
            maxlength="1000"
            rows="2"
            placeholder="Ürünü tanımlayan kısa bir not"
          /></label
        ><label v-if="api.mode === 'entities'" class="field"
          >Ürün türü<select v-model="form.entityTypeId" required>
            <option value="" disabled>Tür seç</option>
            <option
              v-for="t in types.filter((t) => !t.isLocation)"
              :key="t.id"
              :value="t.id"
            >
              {{ t.name }}
            </option>
          </select></label
        ><label class="field"
          >Adet<input
            v-model.number="form.quantity"
            type="number"
            min="1"
            step="1"
            required /></label
        ><label v-if="api.mode === 'legacy'" class="field"
          >Konum<select v-model="form.locationId" required>
            <option v-for="l in locations" :key="l.id" :value="l.id">
              {{ l.name }}
            </option>
          </select></label
        ><label v-else class="field"
          >Üst konum / ürün<select v-model="form.parentId">
            <option value="">Konum yok</option>
            <option
              v-if="
                selected?.parent &&
                !locations.some((l) => l.id === selected?.parent?.id)
              "
              :value="selected.parent.id"
            >
              {{ selected.parent.name }} (ürün)
            </option>
            <option v-for="l in locations" :key="l.id" :value="l.id">
              {{ l.name }}
            </option>
          </select></label
        ><label class="field"
          >Satın alma değeri ({{ currency }})<input
            v-model.number="form.purchasePrice"
            type="number"
            min="0"
            step="0.01"
            required /></label
        ><label class="field"
          >Marka<input v-model="form.manufacturer" maxlength="255" /></label
        ><label class="field"
          >Model<input v-model="form.modelNumber" maxlength="255" /></label
        ><label class="field"
          >Seri numarası<input
            v-model="form.serialNumber"
            maxlength="255" /></label
        ><label class="field"
          >Satın alma tarihi<input
            v-model="form.purchaseDate"
            type="date" /></label
        ><label class="field"
          >Garanti bitişi<input v-model="form.warrantyExpires" type="date"
        /></label>
        <div class="field col-span-2">
          Etiketler
          <div class="flex flex-wrap gap-2 mt-1">
            <label v-for="t in tags" :key="t.id" class="tag-check"
              ><input v-model="form.tagIds" type="checkbox" :value="t.id" />{{
                t.name
              }}</label
            ><span v-if="!tags.length" class="text-muted text-xs"
              >Etiketler ekranından bir etiket ekleyebilirsin.</span
            >
          </div>
        </div>
        <label class="field col-span-2"
          >Notlar<textarea
            v-model="form.notes"
            rows="3"
            maxlength="1000"
          /></label
        ><label class="flex items-center gap-2 text-sm col-span-2"
          ><input type="checkbox" v-model="form.archived" />Arşivlenmiş
          ürün</label
        >
      </div>
      <div class="modal-actions">
        <button @click="close" type="button" class="button-secondary">
          Vazgeç</button
        ><button type="submit" class="button-primary" :disabled="saving">
          <LoaderCircle v-if="saving" class="animate-spin" :size="16" />{{
            saving ? "Kaydediliyor…" : "Ürünü kaydet"
          }}
        </button>
      </div>
    </form>
    <form
      v-else
      @submit.prevent="saveOrganizer"
      class="modal-content space-y-5"
    >
      <label class="field"
        >Ad<input
          v-model="organizerForm.name"
          required
          maxlength="255" /></label
      ><label class="field"
        >Açıklama<textarea
          v-model="organizerForm.description"
          maxlength="1000"
          rows="3"
        /></label
      ><label
        v-if="organizerKind === 'locations' && api.mode === 'entities'"
        class="field"
        >Konum türü<select v-model="organizerForm.entityTypeId" required>
          <option value="" disabled>Konum türü seç</option>
          <option
            v-for="t in types.filter((t) => t.isLocation)"
            :key="t.id"
            :value="t.id"
          >
            {{ t.name }}
          </option>
        </select></label
      ><label v-if="organizerKind === 'locations'" class="field"
        >Üst konum<select v-model="organizerForm.parentId">
          <option value="">Üst konum yok</option>
          <option
            v-for="l in locations.filter((l) => l.id !== organizer?.id)"
            :key="l.id"
            :value="l.id"
          >
            {{ l.name }}
          </option>
        </select></label
      >
      <div class="modal-actions">
        <button type="button" @click="close" class="button-secondary">
          Vazgeç</button
        ><button type="submit" :disabled="saving" class="button-primary">
          <LoaderCircle v-if="saving" class="animate-spin" :size="16" />Kaydet
        </button>
      </div>
    </form>
  </dialog>
  <div v-if="notice" role="status" class="toast">
    <ShieldCheck :size="18" />{{ notice }}
  </div>
</template>
