<script setup lang="ts">
import {
  ArrowUpRight,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
} from "lucide-vue-next";
import InventoryList from "../components/InventoryList.vue";
import { money, navigate, openOrganizer, s } from "../store";
const cards = () => [
  {
    label: "Toplam ürün",
    value: String(s.stats.totalItems),
    icon: Package,
    note: "Envanterindeki ürün kayıtları",
  },
  {
    label: "Toplam değer",
    value: money(s.stats.totalItemPrice),
    icon: ArrowUpRight,
    note: "Kayıtlı satın alma değeri",
  },
  {
    label: "Konumlar",
    value: String(s.stats.totalLocations),
    icon: MapPin,
    note: "Evindeki saklama alanları",
  },
  {
    label: "Garantili ürün",
    value: String(s.stats.totalWithWarranty),
    icon: ShieldCheck,
    note: "Garanti bilgisi olan ürünler",
  },
];
function openLocation(id: string) {
  navigate("inventory");
  s.locationFilter = id;
}
</script>

<template>
  <section
    class="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4"
    aria-label="Koleksiyon özeti"
  >
    <article v-for="card in cards()" :key="card.label" class="card p-4 sm:p-5">
      <div class="flex items-start justify-between gap-2">
        <span class="text-sm font-medium text-muted-foreground">{{
          card.label
        }}</span
        ><component :is="card.icon" :size="21" class="text-primary" />
      </div>
      <p
        class="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        {{ card.value }}
      </p>
      <p class="muted mt-1 hidden lg:block">{{ card.note }}</p>
    </article>
  </section>
  <section class="mt-8 min-w-0">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-xl font-semibold">Evindeki alanlar</h2>
      <button class="text-action" @click="navigate('locations')">
        Tüm konumlar<ArrowUpRight :size="18" />
      </button>
    </div>
    <div class="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
      <button
        v-for="location in s.locations.slice(0, 6)"
        :key="location.id"
        class="card flex min-h-24 min-w-56 snap-start items-center gap-3 px-4 py-4 text-start hover:bg-muted"
        @click="openLocation(location.id)"
      >
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          ><MapPin :size="22"
        /></span>
        <span class="min-w-0"
          ><strong class="block text-base">{{ location.name }}</strong
          ><span class="muted">{{
            location.itemCount === undefined
              ? "Konumu keşfet"
              : location.itemCount + " ürün"
          }}</span></span
        ><ChevronRight :size="20" class="ms-auto text-muted-foreground" />
      </button>
      <button
        v-if="!s.locations.length"
        class="btn-secondary"
        @click="openOrganizer('locations')"
      >
        <Plus :size="21" />İlk konumunu ekle
      </button>
    </div>
  </section>
  <InventoryList
    title="Envanterin"
    subtitle="Eşyaların ve onlara ait tüm bilgiler."
  />
</template>
