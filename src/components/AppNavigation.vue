<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowUpRight,
  CircleHelp,
  Home,
  LogOut,
  Moon,
  Sun,
} from "lucide-vue-next";
import { collection, configuration } from "../navigation";
import { changeGroup, currentGroup, logout, navigate, s } from "../store";
const initials = computed(() =>
  (s.user?.name || "Kullanıcı")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase(),
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      class="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-border bg-background-1 p-3"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        ><Home :size="22"
      /></span>
      <div class="min-w-0 flex-1">
        <p class="muted">Koleksiyonun</p>
        <select
          v-if="s.groups.length > 1"
          v-model="s.tenant"
          :disabled="s.busy"
          class="collection-select"
          aria-label="Koleksiyon"
          @change="changeGroup"
        >
          <option v-for="group in s.groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
        <p v-else class="truncate font-semibold">
          {{ currentGroup()?.name || "Benim evim" }}
        </p>
      </div>
    </div>
    <nav
      class="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-2"
      aria-label="Ana menü"
    >
      <div>
        <p class="nav-caption">Koleksiyon</p>
        <div class="space-y-1">
          <button
            v-for="entry in collection"
            :key="entry.id"
            class="nav-item"
            :class="{ 'nav-active': s.tab === entry.id }"
            :aria-current="s.tab === entry.id ? 'page' : undefined"
            @click="navigate(entry.id)"
          >
            <component :is="entry.icon" :size="21" /><span>{{
              entry.name
            }}</span>
            <span v-if="entry.id === 'inventory'" class="badge ms-auto">{{
              s.stats.totalItems
            }}</span>
          </button>
        </div>
      </div>
      <div>
        <p class="nav-caption">Yönetim</p>
        <div class="space-y-1">
          <button
            v-for="entry in configuration"
            :key="entry.id"
            class="nav-item"
            :class="{ 'nav-active': s.tab === entry.id }"
            :aria-current="s.tab === entry.id ? 'page' : undefined"
            @click="navigate(entry.id)"
          >
            <component :is="entry.icon" :size="21" /><span>{{
              entry.name
            }}</span>
          </button>
        </div>
      </div>
      <div class="border-t border-border pt-3">
        <button class="nav-item" @click="s.dark = !s.dark">
          <Sun v-if="s.dark" :size="21" /><Moon v-else :size="21" />{{
            s.dark ? "Açık görünüm" : "Koyu görünüm"
          }}
        </button>
        <a
          href="https://homebox.software"
          target="_blank"
          rel="noopener noreferrer"
          class="nav-item"
          ><CircleHelp :size="21" />Homebox rehberi<ArrowUpRight
            :size="16"
            class="ms-auto"
        /></a>
      </div>
    </nav>
    <div class="mt-3 flex items-center gap-3 border-t border-border px-5 py-4">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >{{ initials }}</span
      >
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold">{{ s.user?.name || "Kullanıcı" }}</p>
        <p class="muted truncate">{{ s.user?.email }}</p>
      </div>
      <button class="icon-button" aria-label="Çıkış yap" @click="logout">
        <LogOut :size="21" />
      </button>
    </div>
  </div>
</template>
