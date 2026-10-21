<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  ChevronRight,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sun,
  X,
} from "lucide-vue-next";
import HomeboxBrand from "./components/HomeboxBrand.vue";
import AppNavigation from "./components/AppNavigation.vue";
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
import { collection, configuration } from "./navigation";
import {
  currentGroup,
  edit,
  isAuthenticated,
  navigate,
  openOrganizer,
  refresh,
  restoreSession,
  s,
  type TabId,
} from "./store";

const descriptions: Record<TabId, string> = {
  overview: "Evine ve eşyalarına dair her şey, bir arada.",
  inventory: "Eşyalarını bul, bilgilerini güncelle, düzenini koru.",
  locations: "Odalar, dolaplar ve saklama alanların.",
  tags: "Eşyalarını senin için anlamlı gruplarda topla.",
  types: "Ürün ve konum türlerini, varsayılan alanlarını yönet.",
  templates: "Ortak bilgileri bir kez tanımla, her üründe kullan.",
  maintenance: "Planlı ve tamamlanmış bakımların.",
  users: "Hesabını, koleksiyonunu ve üyelerini yönet.",
  tools: "İçe ve dışa aktarma, bildirimler ve bakım araçları.",
};
const title = computed(
  () =>
    [...collection, ...configuration].find((entry) => entry.id === s.tab)
      ?.name || "Genel bakış",
);
const showsGenericError = computed(() =>
  ["overview", "inventory", "locations", "tags"].includes(s.tab),
);
const drawer = ref<HTMLDialogElement | null>(null);
const moreActive = computed(
  () => !["overview", "inventory", "locations"].includes(s.tab),
);

watch(
  () => s.mobileNav,
  async (open) => {
    await nextTick();
    if (open && !drawer.value?.open) drawer.value?.showModal();
    else if (!open) drawer.value?.close();
  },
);
watch(
  () => s.user,
  (user) => {
    if (!user) s.mobileNav = false;
  },
);
function keyboard(event: KeyboardEvent) {
  if (
    event.key === "/" &&
    !s.modal &&
    !s.mobileNav &&
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
let desktopQuery: MediaQueryList;
const closeDrawerOnDesktop = () => {
  if (desktopQuery.matches) s.mobileNav = false;
};
onMounted(() => {
  window.addEventListener("keydown", keyboard);
  desktopQuery = window.matchMedia("(min-width: 1280px)");
  desktopQuery.addEventListener("change", closeDrawerOnDesktop);
  void restoreSession();
});
onUnmounted(() => {
  window.removeEventListener("keydown", keyboard);
  desktopQuery?.removeEventListener("change", closeDrawerOnDesktop);
});
</script>

<template>
  <LoginView v-if="!isAuthenticated()" />
  <div v-else class="app-shell">
    <a class="skip-link" href="#main-content">İçeriğe geç</a>
    <aside
      class="app-sidebar hidden xl:flex"
      aria-label="Kenar çubuğu"
      :inert="s.mobileNav"
    >
      <a
        href="#overview"
        class="brand-link"
        aria-label="Homebox ana sayfa"
        @click.prevent="navigate('overview')"
        ><HomeboxBrand
      /></a>
      <AppNavigation />
    </aside>
    <dialog
      ref="drawer"
      class="navigation-drawer"
      aria-labelledby="navigation-title"
      @cancel.prevent="s.mobileNav = false"
      @click="$event.target === drawer && (s.mobileNav = false)"
    >
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between px-5 py-5">
          <span id="navigation-title"><HomeboxBrand /></span>
          <button
            class="icon-button"
            aria-label="Menüyü kapat"
            @click="s.mobileNav = false"
          >
            <X :size="24" />
          </button>
        </div>
        <AppNavigation />
      </div>
    </dialog>
    <div class="min-w-0 xl:ps-72" :inert="s.mobileNav">
      <header class="app-header">
        <a
          href="#overview"
          class="xl:hidden"
          aria-label="Homebox ana sayfa"
          @click.prevent="navigate('overview')"
          ><HomeboxBrand
        /></a>
        <div class="hidden min-w-0 items-center gap-3 xl:flex">
          <span class="muted truncate">{{
            currentGroup()?.name || "Benim evim"
          }}</span
          ><ChevronRight :size="18" class="text-muted-foreground" /><span
            class="font-medium"
            >{{ title }}</span
          >
        </div>
        <div class="ms-auto flex items-center gap-1 sm:gap-2">
          <button
            class="icon-button xl:hidden"
            :aria-label="s.dark ? 'Açık görünüm' : 'Koyu görünüm'"
            @click="s.dark = !s.dark"
          >
            <Sun v-if="s.dark" :size="22" /><Moon v-else :size="22" />
          </button>
          <button
            class="icon-button"
            aria-label="Verileri yenile"
            :disabled="s.busy || s.saving"
            @click="refresh"
          >
            <RefreshCw :size="21" :class="{ 'animate-spin': s.busy }" />
          </button>
        </div>
      </header>
      <main id="main-content" class="app-content" tabindex="-1">
        <div
          v-if="s.error && !s.modal && showsGenericError"
          role="alert"
          class="alert-error mb-6"
        >
          {{ s.error }}
        </div>
        <section class="page-heading">
          <div class="min-w-0">
            <p class="mb-1 text-sm font-medium text-primary">
              {{ currentGroup()?.name || "Benim evim" }}
            </p>
            <h1>{{ s.tab === "overview" ? "Evine bir bakış." : title }}</h1>
            <p class="muted mt-2 max-w-xl">{{ descriptions[s.tab] }}</p>
          </div>
          <button
            v-if="s.tab === 'overview' || s.tab === 'inventory'"
            class="btn-primary shrink-0"
            :disabled="s.busy || s.saving"
            @click="edit()"
          >
            <Plus :size="21" />Ürün ekle
          </button>
          <button
            v-else-if="s.tab === 'locations' || s.tab === 'tags'"
            class="btn-primary shrink-0"
            :disabled="s.busy || s.saving"
            @click="openOrganizer(s.tab === 'locations' ? 'locations' : 'tags')"
          >
            <Plus :size="21" />{{
              s.tab === "locations" ? "Konum ekle" : "Etiket ekle"
            }}
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
        <footer class="app-footer">
          <span>Homebox · Bir ev dolusu düzen.</span><span>v0.3.0</span>
        </footer>
      </main>
    </div>
    <nav
      class="bottom-navigation xl:hidden"
      aria-label="Hızlı gezinme"
      :inert="s.mobileNav"
    >
      <button
        v-for="entry in collection.slice(0, 3)"
        :key="entry.id"
        :aria-current="s.tab === entry.id ? 'page' : undefined"
        @click="navigate(entry.id)"
      >
        <component :is="entry.icon" :size="23" /><span>{{ entry.name }}</span>
      </button>
      <button
        aria-label="Menüyü aç"
        :aria-expanded="s.mobileNav"
        :class="{ 'is-active': moreActive }"
        @click="s.mobileNav = true"
      >
        <Menu :size="23" /><span>Diğer</span>
      </button>
    </nav>
  </div>
  <ItemModal v-if="s.modal === 'detail' || s.modal === 'edit'" />
  <OrganizerModal v-if="s.modal === 'organizer'" />
  <div v-if="s.notice" role="status" class="toast">
    <ShieldCheck :size="21" class="shrink-0 text-primary" />{{ s.notice }}
  </div>
</template>
