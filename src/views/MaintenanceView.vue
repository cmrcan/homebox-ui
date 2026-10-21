<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { Check, LoaderCircle, Trash2, Wrench } from "lucide-vue-next";
import type { Maintenance } from "../api";
import { api, date, flash, guarded, handleError, money, s } from "../store";

const status = ref<"scheduled" | "completed" | "both">("scheduled");
const entries = ref<Maintenance[]>([]);
const loading = ref(false);
const empty = "0001-01-01";
const done = (m: Maintenance) =>
  !!m.completedDate && !String(m.completedDate).startsWith("0001");

async function load() {
  if (s.demo) return;
  loading.value = true;
  s.error = "";
  try {
    entries.value = (await api.maintenanceList(status.value)) || [];
  } catch (e) {
    handleError(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(status, load);

async function complete(m: Maintenance) {
  await guarded(async () => {
    await api.saveMaintenance(m.id, {
      name: m.name,
      description: m.description || "",
      cost: String(m.cost ?? 0),
      scheduledDate: m.scheduledDate || empty,
      completedDate: new Date().toISOString().slice(0, 10),
    });
    flash("Bakım tamamlandı olarak işaretlendi.");
    await load();
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
  <div v-if="s.demo" class="alert-info">
    Bakım takvimi kendi Homebox hesabınla çalışır. Bakım kaydı eklemek için bir ürünün
    detayını aç.
  </div>
  <template v-else>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="muted max-w-2xl">
        Tüm ürünlerin planlı ve tamamlanmış bakımları. Yeni kayıt eklemek için ürünün detayını aç.
      </p>
      <select v-model="status" class="input !w-52" aria-label="Bakım durumu">
        <option value="scheduled">Planlananlar</option>
        <option value="completed">Tamamlananlar</option>
        <option value="both">Hepsi</option>
      </select>
    </div>
    <div v-if="s.error" role="alert" class="alert-error mt-4">{{ s.error }}</div>
    <div v-if="loading" class="muted flex items-center justify-center gap-2 py-16" role="status">
      <LoaderCircle :size="22" class="animate-spin" />Bakım kayıtları yükleniyor…
    </div>
    <div v-else-if="!entries.length" class="card mt-4 flex flex-col items-center px-6 py-14 text-center">
      <span class="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400"><Wrench :size="28" /></span>
      <h3 class="text-lg font-semibold">Gösterilecek bakım kaydı yok</h3>
      <p class="muted mt-1 max-w-sm">Filtreyi değiştir ya da bir ürünün detayından bakım kaydı ekle.</p>
    </div>
    <div v-else class="card mt-4 overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr><th>Bakım</th><th>Ürün</th><th>Tarih</th><th>Maliyet</th><th class="text-end">İşlemler</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in entries" :key="m.id">
            <td><strong class="block">{{ m.name }}</strong><small class="muted">{{ m.description }}</small></td>
            <td>{{ m.itemName || m.entityName || "—" }}</td>
            <td>
              <span :class="done(m) ? 'badge-green' : 'badge-blue'">
                {{ done(m) ? "Tamamlandı " + date(m.completedDate) : "Planlanan " + date(m.scheduledDate) }}
              </span>
            </td>
            <td>{{ Number(m.cost) ? money(Number(m.cost)) : "—" }}</td>
            <td class="text-end">
              <button v-if="!done(m)" class="icon-button" :aria-label="m.name + ' tamamlandı olarak işaretle'" @click="complete(m)"><Check :size="16" /></button>
              <button class="icon-button" :aria-label="m.name + ' bakım kaydını sil'" @click="remove(m)"><Trash2 :size="16" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>
