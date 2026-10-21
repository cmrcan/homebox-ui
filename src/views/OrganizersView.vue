<script setup lang="ts">
import { computed } from "vue";
import { ArrowUpRight, MapPin, Plus, Settings2, Tag } from "lucide-vue-next";
import { filterOrganizer, openOrganizer, s } from "../store";

const kind = computed(() => (s.tab === "locations" ? "locations" : "tags"));
const list = computed(() =>
  kind.value === "locations" ? s.locations : s.tags,
);
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <article v-for="o in list" :key="o.id" class="card card-body flex flex-col">
      <span
        class="inline-flex size-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400"
      >
        <MapPin v-if="kind === 'locations'" :size="22" /><Tag
          v-else
          :size="22"
        />
      </span>
      <h2 class="mt-4 text-lg font-semibold">{{ o.name }}</h2>
      <p class="muted mt-1">
        {{ o.description || "Kendi düzeninin bir parçası." }}
      </p>
      <div class="mt-auto flex items-center justify-between pt-6">
        <button class="text-action" @click="filterOrganizer(kind, o.id)">
          Ürünleri gör<ArrowUpRight :size="14" />
        </button>
        <button
          class="icon-button"
          :aria-label="o.name + ' düzenle'"
          @click="openOrganizer(kind, o)"
        >
          <Settings2 :size="16" />
        </button>
      </div>
    </article>
    <button
      class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
      @click="openOrganizer(kind)"
    >
      <Plus :size="24" />{{
        kind === "locations" ? "Yeni konum" : "Yeni etiket"
      }}
    </button>
  </section>
</template>
