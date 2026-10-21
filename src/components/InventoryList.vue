<script setup lang="ts">
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
} from "lucide-vue-next";
import { edit, money, openItem, photo, s } from "../store";

defineProps<{ title: string; subtitle: string }>();

const filtering = () => !!(s.search || s.locationFilter || s.tagFilter);
function clearFilters() {
  s.search = "";
  s.locationFilter = "";
  s.tagFilter = "";
}
</script>

<template>
  <section class="mt-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">
          {{ title }}<span class="badge ms-2">{{ s.result.total }}</span>
        </h2>
        <p class="muted">{{ subtitle }}</p>
      </div>
      <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
        <button
          class="icon-button !size-8"
          :class="{ '!bg-gray-100 dark:!bg-neutral-700': s.view === 'grid' }"
          aria-label="Kart görünümü"
          :aria-pressed="s.view === 'grid'"
          @click="s.view = 'grid'"
        >
          <LayoutGrid :size="16" />
        </button>
        <button
          class="icon-button !size-8"
          :class="{ '!bg-gray-100 dark:!bg-neutral-700': s.view === 'list' }"
          aria-label="Liste görünümü"
          :aria-pressed="s.view === 'list'"
          @click="s.view = 'list'"
        >
          <List :size="18" />
        </button>
      </div>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-[1fr_12rem_12rem_auto]">
      <label class="search-field"
        ><Search :size="18" /><input
          v-model="s.search"
          aria-label="Envanterde ara"
          placeholder="Bir eşya, marka veya açıklama ara…"
        /><kbd>/</kbd></label
      >
      <select v-model="s.locationFilter" class="input" aria-label="Konuma göre filtrele">
        <option value="">Tüm konumlar</option>
        <option v-for="l in s.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <select v-model="s.tagFilter" class="input" aria-label="Etikete göre filtrele">
        <option value="">Tüm etiketler</option>
        <option v-for="t in s.tags" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <label class="tag-check justify-center" title="Arşivlenen ürünleri dahil et"
        ><input v-model="s.archived" type="checkbox" class="sr-only" /><Archive :size="16" />Arşiv</label
      >
    </div>

    <div v-if="s.busy" class="muted flex items-center justify-center gap-2 py-16" role="status">
      <LoaderCircle :size="22" class="animate-spin" />Envanter yükleniyor…
    </div>

    <div v-else-if="!s.result.items.length" class="card mt-4 flex flex-col items-center px-6 py-14 text-center">
      <span class="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400">
        <Package :size="28" />
      </span>
      <h3 class="text-lg font-semibold">
        {{ filtering() ? "Eşleşen ürün bulunamadı" : "Evinin hikâyesini kaydetmeye başla" }}
      </h3>
      <p class="muted mt-1 mb-5 max-w-sm">
        {{
          filtering()
            ? "Farklı bir arama veya filtre deneyebilirsin."
            : "İlk eşyanı ekle; fotoğrafı, belgeleri ve bilgileri hep elinin altında olsun."
        }}
      </p>
      <button v-if="filtering()" class="btn-secondary" @click="clearFilters">Filtreleri temizle</button>
      <button v-else class="btn-primary" @click="edit()"><Plus :size="16" />İlk ürününü ekle</button>
    </div>

    <div v-else-if="s.view === 'grid'" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <button v-for="item in s.result.items" :key="item.id" class="item-card" @click="openItem(item)">
        <div class="item-visual">
          <img v-if="photo(item)" :src="photo(item)" :alt="item.name" loading="lazy" />
          <Box v-else :size="48" :stroke-width="1" />
          <span v-if="item.archived" class="badge absolute start-3 top-3">Arşiv</span>
          <span class="badge absolute start-3 bottom-3">
            <MapPin :size="11" />{{ item.location?.name || item.parent?.name || "Konum yok" }}
          </span>
        </div>
        <div class="flex flex-1 flex-col p-4">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold">{{ item.name }}</h3>
            <ArrowUpRight :size="16" class="mt-0.5 shrink-0 text-gray-400" />
          </div>
          <p class="muted mt-1 line-clamp-2">{{ item.description || "Açıklama eklenmemiş" }}</p>
          <div class="mt-3 flex flex-wrap gap-1">
            <span v-for="t in item.tags.slice(0, 2)" :key="t.id" class="badge-blue">{{ t.name }}</span>
            <span v-if="item.tags.length > 2" class="badge">+{{ item.tags.length - 2 }}</span>
          </div>
          <div class="mt-auto flex items-center justify-between pt-4 text-sm">
            <strong>{{ money(item.purchasePrice) }}</strong>
            <span class="muted">{{ item.quantity }} adet</span>
          </div>
        </div>
      </button>
    </div>

    <div v-else class="card mt-4 overflow-x-auto">
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
              <button class="text-start" @click="openItem(item)">
                <strong class="block">{{ item.name }}</strong>
                <small class="muted">{{ item.description }}</small>
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

    <div v-if="s.result.total" class="muted mt-4 flex flex-wrap items-center justify-between gap-3">
      <span>{{ (s.page - 1) * 12 + 1 }}–{{ Math.min(s.page * 12, s.result.total) }} / {{ s.result.total }} ürün</span>
      <div class="flex items-center gap-3">
        <button class="icon-button" :disabled="s.page === 1" aria-label="Önceki sayfa" @click="s.page--">
          <ChevronLeft :size="18" />
        </button>
        <span>Sayfa {{ s.page }}</span>
        <button class="icon-button" :disabled="s.page * 12 >= s.result.total" aria-label="Sonraki sayfa" @click="s.page++">
          <ChevronRight :size="18" />
        </button>
      </div>
    </div>
  </section>
</template>
