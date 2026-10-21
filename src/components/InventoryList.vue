<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Archive,
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  LoaderCircle,
  MapPin,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-vue-next";
import { edit, money, openItem, photo, s } from "../store";
defineProps<{ title: string; subtitle: string }>();
const filtersOpen = ref(false);
const filtering = () =>
  !!(s.search || s.locationFilter || s.tagFilter || s.archived);
const filterCount = computed(
  () => Number(!!s.locationFilter) + Number(!!s.tagFilter) + Number(s.archived),
);
watch(
  () => [s.locationFilter, s.tagFilter, s.archived],
  () => {
    if (filterCount.value) filtersOpen.value = true;
  },
  { immediate: true },
);

function clearFilters() {
  s.search = "";
  s.locationFilter = "";
  s.tagFilter = "";
  s.archived = false;
}
</script>

<template>
  <section class="mt-8 min-w-0" :aria-busy="s.busy">
    <div>
      <h2 class="flex items-center gap-2.5 text-xl font-semibold">
        {{ title }}<span class="badge">{{ s.result.total }}</span>
      </h2>
      <p class="muted mt-1">{{ subtitle }}</p>
    </div>
    <div class="inventory-controls">
      <label class="search-field basis-full sm:basis-64 sm:flex-1"
        ><Search :size="21" /><input
          v-model="s.search"
          type="search"
          aria-label="Envanterde ara"
          placeholder="Envanterinde ara…"
          autocomplete="off"
        /><kbd>/</kbd></label
      >
      <button
        class="btn-secondary filter-button flex-1 sm:flex-none"
        :aria-expanded="filtersOpen"
        aria-controls="inventory-filters"
        @click="filtersOpen = !filtersOpen"
      >
        <SlidersHorizontal :size="21" />Filtreler<span
          v-if="filterCount"
          class="badge-blue"
          >{{ filterCount }}</span
        >
      </button>
      <div
        class="segmented-control"
        role="group"
        aria-label="Envanter görünümü"
      >
        <button
          class="icon-button"
          aria-label="Kart görünümü"
          :aria-pressed="s.view === 'grid'"
          @click="s.view = 'grid'"
        >
          <LayoutGrid :size="21" />
        </button>
        <button
          class="icon-button"
          aria-label="Liste görünümü"
          :aria-pressed="s.view === 'list'"
          @click="s.view = 'list'"
        >
          <List :size="22" />
        </button>
      </div>
    </div>
    <div v-show="filtersOpen" id="inventory-filters" class="inventory-filters">
      <select
        v-model="s.locationFilter"
        class="input"
        aria-label="Konuma göre filtrele"
      >
        <option value="">Tüm konumlar</option>
        <option
          v-for="location in s.locations"
          :key="location.id"
          :value="location.id"
        >
          {{ location.name }}
        </option>
      </select>
      <select
        v-model="s.tagFilter"
        class="input"
        aria-label="Etikete göre filtrele"
      >
        <option value="">Tüm etiketler</option>
        <option v-for="tag in s.tags" :key="tag.id" :value="tag.id">
          {{ tag.name }}
        </option>
      </select>
      <label class="tag-check min-h-12"
        ><input
          v-model="s.archived"
          type="checkbox"
          class="size-4 rounded border-border text-primary focus:ring-primary"
        /><Archive :size="19" />Arşivdekiler</label
      >
      <button
        v-if="filterCount"
        class="text-action w-fit"
        @click="clearFilters"
      >
        <X :size="18" />Filtreleri temizle
      </button>
    </div>
    <div
      v-if="s.busy"
      class="muted flex items-center justify-center gap-3 py-20"
      role="status"
    >
      <LoaderCircle :size="25" class="animate-spin" />Envanter yükleniyor…
    </div>
    <div
      v-else-if="!s.result.items.length"
      class="card mt-5 flex flex-col items-center px-6 py-14 text-center"
    >
      <span
        class="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        ><Package :size="32" :stroke-width="1.5"
      /></span>
      <h3 class="text-xl font-semibold">
        {{ filtering() ? "Eşleşen ürün bulunamadı" : "İlk eşyanı ekle." }}
      </h3>
      <p class="muted mb-6 mt-2 max-w-sm">
        {{
          filtering()
            ? "Farklı bir arama veya filtre deneyebilirsin."
            : "Fotoğrafları, belgeleri ve önemli bilgileriyle evinin envanterini oluştur."
        }}
      </p>
      <button v-if="filtering()" class="btn-secondary" @click="clearFilters">
        Filtreleri temizle
      </button>
      <button v-else class="btn-primary" @click="edit()">
        <Plus :size="21" />İlk ürününü ekle
      </button>
    </div>
    <div
      v-else-if="s.view === 'grid'"
      class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <button
        v-for="item in s.result.items"
        :key="item.id"
        class="item-card"
        @click="openItem(item)"
      >
        <div class="item-visual">
          <img
            v-if="photo(item)"
            :src="photo(item)"
            :alt="item.name"
            loading="lazy"
          /><Box v-else :size="45" :stroke-width="1.25" /><span
            v-if="item.archived"
            class="badge absolute start-2 top-2"
            >Arşiv</span
          >
        </div>
        <div class="item-content">
          <div class="flex items-start justify-between gap-2">
            <h3>{{ item.name }}</h3>
            <ArrowUpRight :size="19" class="mt-0.5 text-muted-foreground" />
          </div>
          <p class="muted mt-1 line-clamp-2">
            {{ item.description || "Açıklama eklenmemiş" }}
          </p>
          <div class="item-location">
            <MapPin :size="16" /><span>{{
              item.location?.name || item.parent?.name || "Konum yok"
            }}</span>
          </div>
          <div v-if="item.tags.length" class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="tag in item.tags.slice(0, 2)"
              :key="tag.id"
              class="badge-blue"
              >{{ tag.name }}</span
            ><span v-if="item.tags.length > 2" class="badge"
              >+{{ item.tags.length - 2 }}</span
            >
          </div>
          <div
            class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4"
          >
            <strong class="text-base">{{ money(item.purchasePrice) }}</strong
            ><span class="muted">{{ item.quantity }} adet</span>
          </div>
        </div>
      </button>
    </div>
    <template v-else>
      <div
        class="card mt-5 overflow-hidden sm:hidden"
        data-testid="mobile-inventory-list"
      >
        <button
          v-for="item in s.result.items"
          :key="item.id"
          class="inventory-list-row"
          @click="openItem(item)"
        >
          <span
            class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground"
            ><img
              v-if="photo(item)"
              :src="photo(item)"
              :alt="item.name"
              class="size-full object-cover"
              loading="lazy" /><Box v-else :size="28"
          /></span>
          <span class="min-w-0 flex-1"
            ><strong class="block break-words text-base">{{ item.name }}</strong
            ><span class="muted mt-1 block truncate">{{
              item.location?.name || item.parent?.name || "Konum yok"
            }}</span
            ><span class="mt-1 block font-medium">{{
              money(item.purchasePrice)
            }}</span></span
          ><ChevronRight :size="20" class="text-muted-foreground" />
        </button>
      </div>
      <div class="card mt-5 hidden overflow-x-auto sm:block">
        <table class="data-table">
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
            <tr v-for="item in s.result.items" :key="item.id">
              <td>
                <button class="min-h-11 text-start" @click="openItem(item)">
                  <strong class="block">{{ item.name }}</strong
                  ><small class="muted">{{ item.description }}</small>
                </button>
              </td>
              <td>{{ item.location?.name || item.parent?.name || "—" }}</td>
              <td>{{ item.tags.map((tag) => tag.name).join(", ") || "—" }}</td>
              <td>{{ item.quantity }}</td>
              <td class="font-semibold">{{ money(item.purchasePrice) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <div
      v-if="s.result.total"
      class="muted mt-5 flex flex-wrap items-center justify-between gap-3"
    >
      <span
        >{{ (s.page - 1) * 12 + 1 }}–{{
          Math.min(s.page * 12, s.result.total)
        }}
        / {{ s.result.total }} ürün</span
      >
      <div class="flex items-center gap-2">
        <button
          class="icon-button border-border bg-card"
          :disabled="s.page === 1"
          aria-label="Önceki sayfa"
          @click="s.page--"
        >
          <ChevronLeft :size="21" /></button
        ><span class="px-1">Sayfa {{ s.page }}</span
        ><button
          class="icon-button border-border bg-card"
          :disabled="s.page * 12 >= s.result.total"
          aria-label="Sonraki sayfa"
          @click="s.page++"
        >
          <ChevronRight :size="21" />
        </button>
      </div>
    </div>
  </section>
</template>
