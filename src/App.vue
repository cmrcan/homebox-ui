<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Box,
  ChevronRight,
  CircleHelp,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Package,
  Plus,
  ShieldCheck,
  Sun,
  Tag,
  Users,
  Wrench,
  Settings2,
} from "lucide-vue-next";
import LoginView from "./components/LoginView.vue";
import ItemModal from "./components/ItemModal.vue";
import OrganizerModal from "./components/OrganizerModal.vue";
import OverviewView from "./views/OverviewView.vue";
import InventoryView from "./views/InventoryView.vue";
import OrganizersView from "./views/OrganizersView.vue";
import TypesView from "./views/TypesView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import MaintenanceView from "./views/MaintenanceView.vue";
import UsersView from "./views/UsersView.vue";
import ToolsView from "./views/ToolsView.vue";
import {
  changeGroup,
  currentGroup,
  edit,
  isAuthenticated,
  logout,
  navigate,
  openOrganizer,
  refresh,
  restoreSession,
  s,
  type TabId,
} from "./store";

const collection = [
  { id: "overview", name: "Genel bakış", icon: LayoutDashboard },
  { id: "inventory", name: "Envanterim", icon: Package },
  { id: "locations", name: "Konumlar", icon: MapPin },
  { id: "tags", name: "Etiketler", icon: Tag },
] as const;
const configuration = [
  { id: "types", name: "Ürün türleri", icon: Layers },
  { id: "templates", name: "Alan şablonları", icon: LayoutTemplate },
  { id: "maintenance", name: "Bakım", icon: Wrench },
  { id: "users", name: "Kullanıcılar", icon: Users },
  { id: "tools", name: "Araçlar", icon: Settings2 },
] as const;
const descriptions: Record<TabId, string> = {
  overview: "Sahip olduklarını tanı. İhtiyacın olanı kolayca bul.",
  inventory: "Her eşyanın bir yeri, her bilginin bir kaydı var.",
  locations: "Odalar, dolaplar ve saklama alanların.",
  tags: "Eşyalarını senin için anlamlı gruplarda topla.",
  types: "Ürün ve konum türlerini yönet, türlere özel alan şablonu bağla.",
  templates: "Ortak özel alanları bir kez tanımla, her üründe kullan.",
  maintenance: "Planlı ve tamamlanmış bakımlar.",
  users: "Profilini, koleksiyonunu ve üyelerini yönet.",
  tools: "İçe/dışa aktarma, bildirimler ve toplu düzeltmeler.",
};
const title = computed(
  () =>
    [...collection, ...configuration].find((n) => n.id === s.tab)?.name ||
    "Genel bakış",
);
const showsGenericError = computed(() =>
  ["overview", "inventory", "locations", "tags"].includes(s.tab),
);
const initials = computed(() =>
  (s.user?.name || "Demo Kullanıcı")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase(),
);

function keyboard(event: KeyboardEvent) {
  if (
    event.key === "/" &&
    !s.modal &&
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
onMounted(() => {
  window.addEventListener("keydown", keyboard);
  void restoreSession();
});
onUnmounted(() => window.removeEventListener("keydown", keyboard));
</script>

<template>
  <LoginView v-if="!isAuthenticated()" />
  <div v-else>
    <button
      v-if="s.mobileNav"
      class="fixed inset-0 z-[55] bg-gray-900/50 lg:hidden"
      aria-label="Menüyü kapat"
      @click="s.mobileNav = false"
    ></button>

    <aside
      class="fixed inset-y-0 start-0 z-[60] flex w-64 -translate-x-full flex-col overflow-y-auto border-e border-gray-200 bg-white p-3 transition-transform duration-200 lg:translate-x-0 dark:border-neutral-700 dark:bg-neutral-800"
      :class="{ '!translate-x-0': s.mobileNav }"
    >
      <a
        href="#overview"
        class="flex items-center gap-x-2 px-2.5 py-2 text-xl font-semibold"
        @click.prevent="navigate('overview')"
        ><Box :size="24" class="text-blue-600" />homebox</a
      >

      <div class="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 p-2.5 dark:border-neutral-700">
        <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400"><Home :size="18" /></span>
        <div class="min-w-0 flex-1">
          <p class="muted text-xs">Kişisel alanın</p>
          <select
            v-if="s.groups.length > 1"
            v-model="s.tenant"
            :disabled="s.busy"
            class="w-full truncate border-0 bg-transparent p-0 text-sm font-semibold focus:ring-0"
            aria-label="Koleksiyon"
            @change="changeGroup"
          >
            <option v-for="g in s.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <p v-else class="truncate text-sm font-semibold">{{ currentGroup()?.name || "Benim evim" }}</p>
        </div>
        <ShieldCheck :size="15" class="text-blue-600" />
      </div>

      <nav class="mt-2">
        <p class="nav-caption">Koleksiyon</p>
        <div class="space-y-0.5">
          <button
            v-for="n in collection"
            :key="n.id"
            class="nav-item"
            :class="{ 'nav-active': s.tab === n.id }"
            @click="navigate(n.id)"
          >
            <component :is="n.icon" :size="18" /><span>{{ n.name }}</span
            ><span v-if="n.id === 'inventory'" class="badge ms-auto">{{ s.stats.totalItems }}</span>
          </button>
        </div>
        <p class="nav-caption">Yapılandırma</p>
        <div class="space-y-0.5">
          <button
            v-for="n in configuration"
            :key="n.id"
            class="nav-item"
            :class="{ 'nav-active': s.tab === n.id }"
            @click="navigate(n.id)"
          >
            <component :is="n.icon" :size="18" /><span>{{ n.name }}</span>
          </button>
        </div>
      </nav>

      <div class="mt-auto space-y-0.5 pt-4">
        <button class="nav-item" @click="s.dark = !s.dark">
          <Sun v-if="s.dark" :size="18" /><Moon v-else :size="18" />{{
            s.dark ? "Açık görünüm" : "Koyu görünüm"
          }}
        </button>
        <a href="https://homebox.software" target="_blank" rel="noopener noreferrer" class="nav-item"
          ><CircleHelp :size="18" />Homebox rehberi<ArrowUpRight :size="14" class="ms-auto"
        /></a>
        <div class="mt-2 flex items-center gap-3 border-t border-gray-200 px-1 pt-3 dark:border-neutral-700">
          <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{{ initials }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ s.user?.name || "Demo Kullanıcı" }}</p>
            <p class="muted truncate text-xs">{{ s.user?.email || "Örnek envanter" }}</p>
          </div>
          <button class="icon-button" aria-label="Çıkış yap" @click="logout"><LogOut :size="17" /></button>
        </div>
      </div>
    </aside>

    <div class="lg:ps-64">
      <header class="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6 dark:border-neutral-700 dark:bg-neutral-800/90">
        <div class="flex items-center gap-2">
          <button class="icon-button lg:hidden" aria-label="Menüyü aç" @click="s.mobileNav = true"><Menu :size="20" /></button>
          <span class="muted">Benim evim</span><ChevronRight :size="14" class="text-gray-400" />
          <span class="text-sm font-medium">{{ title }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge-green hidden sm:inline-flex">{{ s.demo ? "Demo modu" : "Homebox bağlantısı" }}</span>
          <button class="icon-button" aria-label="Verileri yenile" @click="refresh">
            <ArrowDownLeft :size="18" :class="{ 'animate-pulse': s.busy }" />
          </button>
        </div>
      </header>

      <main class="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div v-if="s.demo" class="alert-info mb-6 flex flex-wrap items-center justify-between gap-2">
          <span>Örnek envanteri keşfediyorsun. Değişiklikler Homebox sunucuna gönderilmez.</span>
          <button class="text-action" @click="logout">Hesabımla giriş yap<ArrowUpRight :size="14" /></button>
        </div>
        <div v-if="s.error && !s.modal && showsGenericError" role="alert" class="alert-error mb-6">{{ s.error }}</div>

        <section class="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">{{ s.tab === "overview" ? "Evine bir bakış." : title }}</h1>
            <p class="muted mt-1">{{ descriptions[s.tab] }}</p>
          </div>
          <button v-if="s.tab === 'overview' || s.tab === 'inventory'" class="btn-primary" :disabled="s.busy || s.saving" @click="edit()">
            <Plus :size="16" />Ürün ekle
          </button>
          <button v-else-if="s.tab === 'locations' || s.tab === 'tags'" class="btn-primary" :disabled="s.busy || s.saving" @click="openOrganizer(s.tab === 'locations' ? 'locations' : 'tags')">
            <Plus :size="16" />{{ s.tab === "locations" ? "Konum ekle" : "Etiket ekle" }}
          </button>
        </section>

        <OverviewView v-if="s.tab === 'overview'" />
        <InventoryView v-else-if="s.tab === 'inventory'" />
        <OrganizersView v-else-if="s.tab === 'locations' || s.tab === 'tags'" />
        <TypesView v-else-if="s.tab === 'types'" />
        <TemplatesView v-else-if="s.tab === 'templates'" />
        <MaintenanceView v-else-if="s.tab === 'maintenance'" />
        <UsersView v-else-if="s.tab === 'users'" />
        <ToolsView v-else-if="s.tab === 'tools'" />

        <footer class="muted mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-6 text-xs dark:border-neutral-700">
          <span>homebox<span class="text-blue-600">.</span> Bir ev dolusu düzen.</span>
          <a href="https://github.com/sysadminsmedia/homebox" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 hover:underline"
            >Homebox API ile çalışır<ArrowUpRight :size="12"
          /></a>
        </footer>
      </main>
    </div>
  </div>

  <ItemModal v-if="s.modal === 'detail' || s.modal === 'edit'" />
  <OrganizerModal v-if="s.modal === 'organizer'" />
  <div v-if="s.notice" role="status" class="toast"><ShieldCheck :size="18" class="text-blue-600" />{{ s.notice }}</div>
</template>
