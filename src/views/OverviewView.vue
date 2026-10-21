<script setup lang="ts">
import { ArrowUpRight, ChevronRight, MapPin, Package, Plus, ShieldCheck } from "lucide-vue-next";
import InventoryList from "../components/InventoryList.vue";
import { money, navigate, openOrganizer, s } from "../store";

const cards = () => [
  { label: "Toplam ürün", value: String(s.stats.totalItems), icon: Package, note: "Envanterindeki ürün kayıtları" },
  { label: "Toplam değer", value: money(s.stats.totalItemPrice), icon: ArrowUpRight, note: "Homebox satın alma toplamı" },
  { label: "Konumlar", value: String(s.stats.totalLocations), icon: MapPin, note: "Her şeyin kendine ait bir yeri var" },
  { label: "Garantili ürün", value: String(s.stats.totalWithWarranty), icon: ShieldCheck, note: "Homebox garanti kaydı olan ürünler" },
];
function openLocation(id: string) {
  navigate("inventory");
  s.locationFilter = id;
}
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <article v-for="c in cards()" :key="c.label" class="card card-body">
      <div class="flex items-center justify-between">
        <span class="muted">{{ c.label }}</span>
        <span class="inline-flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400">
          <component :is="c.icon" :size="16" />
        </span>
      </div>
      <p class="mt-2 text-2xl font-semibold">{{ c.value }}</p>
      <p class="muted mt-1 text-xs">{{ c.note }}</p>
    </article>
  </section>

  <section class="mt-8">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Evindeki alanlar</h2>
        <p class="muted">Bir konum seç, içindekileri keşfet.</p>
      </div>
      <button class="text-action" @click="navigate('locations')">Tüm konumlar<ArrowUpRight :size="15" /></button>
    </div>
    <div class="mt-3 flex gap-3 overflow-x-auto pb-1">
      <button
        v-for="l in s.locations.slice(0, 6)"
        :key="l.id"
        class="card flex min-w-52 items-center gap-3 px-4 py-3 text-start hover:bg-gray-50 dark:hover:bg-neutral-700"
        @click="openLocation(l.id)"
      >
        <span class="inline-flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-neutral-700"><MapPin :size="18" /></span>
        <span>
          <strong class="block text-sm">{{ l.name }}</strong>
          <small class="muted">{{ l.itemCount === undefined ? "Konumu keşfet" : l.itemCount + " ürün" }}</small>
        </span>
        <ChevronRight :size="15" class="ms-auto text-gray-400" />
      </button>
      <button v-if="!s.locations.length" class="btn-secondary" @click="openOrganizer('locations')">
        <Plus :size="16" />İlk konumunu ekle
      </button>
    </div>
  </section>

  <InventoryList title="Envanterin" subtitle="Eşyaların ve onlara ait tüm bilgiler." />
</template>
