<script setup lang="ts">
import { reactive, ref } from "vue";
import { Check, Plus, Trash2, Wrench } from "lucide-vue-next";
import type { Maintenance } from "../api";
import { api, date, flash, guarded, money } from "../store";

const props = defineProps<{ itemId: string }>();
const entries = ref<Maintenance[]>([]);
const loaded = ref(false);
const entry = reactive({
  name: "",
  scheduledDate: "",
  cost: 0,
  description: "",
});

const empty = "0001-01-01";
const done = (m: Maintenance) =>
  !!m.completedDate && !String(m.completedDate).startsWith("0001");

async function load() {
  await guarded(async () => {
    entries.value = (await api.itemMaintenance(props.itemId)) || [];
    loaded.value = true;
  });
}
async function add() {
  await guarded(async () => {
    await api.addMaintenance(props.itemId, {
      name: entry.name.trim(),
      description: entry.description,
      cost: String(entry.cost || 0),
      scheduledDate: entry.scheduledDate || empty,
      completedDate: empty,
    });
    Object.assign(entry, {
      name: "",
      scheduledDate: "",
      cost: 0,
      description: "",
    });
    entries.value = (await api.itemMaintenance(props.itemId)) || [];
    flash("Bakım kaydı eklendi.");
  });
}
async function complete(m: Maintenance) {
  await guarded(async () => {
    await api.saveMaintenance(m.id, {
      name: m.name,
      description: m.description || "",
      cost: String(m.cost ?? 0),
      scheduledDate: m.scheduledDate || empty,
      completedDate: new Date().toISOString().slice(0, 10),
    });
    entries.value = (await api.itemMaintenance(props.itemId)) || [];
  });
}
async function remove(m: Maintenance) {
  await guarded(async () => {
    await api.deleteMaintenance(m.id);
    entries.value = entries.value.filter((x) => x.id !== m.id);
  });
}
</script>

<template>
  <section class="mt-6">
    <div class="flex items-center justify-between gap-3">
      <h3 class="font-semibold">Bakım kayıtları</h3>
      <button v-if="!loaded" type="button" class="btn-secondary" @click="load">
        <Wrench :size="16" />Kayıtları göster
      </button>
    </div>
    <template v-if="loaded">
      <p v-if="!entries.length" class="muted mt-2">
        Bu ürün için bakım kaydı yok.
      </p>
      <ul v-else class="mt-2 space-y-2">
        <li
          v-for="m in entries"
          :key="m.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-neutral-700"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ m.name }}</p>
            <p class="muted">
              {{
                done(m)
                  ? "Tamamlandı: " + date(m.completedDate)
                  : "Planlanan: " + date(m.scheduledDate)
              }}
              <template v-if="Number(m.cost)">
                · {{ money(Number(m.cost)) }}</template
              >
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              v-if="!done(m)"
              type="button"
              class="icon-button"
              :aria-label="m.name + ' tamamlandı olarak işaretle'"
              @click="complete(m)"
            >
              <Check :size="16" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="m.name + ' bakım kaydını sil'"
              @click="remove(m)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </li>
      </ul>
      <form
        class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        @submit.prevent="add"
      >
        <input
          v-model="entry.name"
          class="input"
          required
          placeholder="Bakım adı"
          aria-label="Bakım adı"
        />
        <input
          v-model="entry.scheduledDate"
          class="input"
          type="date"
          aria-label="Planlanan tarih"
        />
        <input
          v-model.number="entry.cost"
          class="input"
          type="number"
          min="0"
          step="0.01"
          aria-label="Bakım maliyeti"
        />
        <input
          v-model="entry.description"
          class="input"
          placeholder="Not"
          aria-label="Bakım notu"
        />
        <button type="submit" class="btn-secondary sm:col-span-2">
          <Plus :size="16" />Bakım kaydı ekle
        </button>
      </form>
    </template>
  </section>
</template>
