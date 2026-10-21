<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  Bell,
  Download,
  LoaderCircle,
  Send,
  Trash2,
  Upload,
} from "lucide-vue-next";
import type { Notifier } from "../api";
import { api, flash, guarded, handleError, refresh, s } from "../store";

const notifiers = ref<Notifier[]>([]);
const notifierNote = ref("");
const notifier = reactive({ name: "", url: "" });
const importFile = ref<File | null>(null);

const actions = [
  {
    id: "ensure-asset-ids",
    name: "Eksik varlık numaralarını ata",
    note: "Numarası olmayan ürünlere sıradaki varlık numarasını verir.",
  },
  {
    id: "ensure-import-refs",
    name: "İçe aktarma referanslarını tamamla",
    note: "Referansı olmayan ürünlere benzersiz referans ekler.",
  },
  {
    id: "set-primary-photos",
    name: "Ana fotoğrafları belirle",
    note: "Fotoğrafı olup ana fotoğrafı seçilmemiş ürünleri düzeltir.",
  },
  {
    id: "create-missing-thumbnails",
    name: "Eksik küçük resimleri oluştur",
    note: "Büyük fotoğraflar için küçük önizleme üretir.",
  },
  {
    id: "zero-item-time-fields",
    name: "Tarihlerden saat bilgisini sil",
    note: "Satın alma ve satış tarihlerindeki saat kısmını sıfırlar.",
  },
];

async function loadNotifiers() {
  try {
    notifiers.value = (await api.notifiers()) || [];
  } catch {
    notifierNote.value = "Bu Homebox sürümü bildirimleri sunmuyor olabilir.";
  }
}
onMounted(() => {
  void loadNotifiers();
});

const run = (id: string, name: string) =>
  guarded(async () => {
    const result = await api.runAction(id);
    flash(`${name}: ${result?.completed ?? 0} kayıt işlendi.`);
    await refresh();
  });
const exportCsv = () =>
  guarded(async () => {
    const blob = await api.exportCsv();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "homebox-envanter.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });
const importCsv = () =>
  guarded(async () => {
    if (!importFile.value) return;
    const result = await api.importCsv(importFile.value);
    importFile.value = null;
    flash(`${result?.completed ?? 0} kayıt içe aktarıldı.`);
    await refresh();
  });
const addNotifier = () =>
  guarded(async () => {
    await api.saveNotifier({
      name: notifier.name.trim(),
      url: notifier.url.trim(),
      isActive: true,
    });
    Object.assign(notifier, { name: "", url: "" });
    await loadNotifiers();
    flash("Bildirim eklendi.");
  });
const toggleNotifier = (n: Notifier) =>
  guarded(async () => {
    await api.saveNotifier({ name: n.name, isActive: !n.isActive }, n);
    await loadNotifiers();
  });
const removeNotifier = (n: Notifier) =>
  guarded(async () => {
    await api.deleteNotifier(n.id);
    notifiers.value = notifiers.value.filter((x) => x.id !== n.id);
  });
async function testNotifier() {
  if (!notifier.url.trim()) return;
  try {
    await api.testNotifier(notifier.url.trim());
    flash("Test bildirimi gönderildi.");
  } catch (e) {
    handleError(e);
  }
}
function pick(event: Event) {
  importFile.value = (event.target as HTMLInputElement).files?.[0] || null;
}
</script>

<template>
  <div v-if="s.error" role="alert" class="alert-error mb-4">{{ s.error }}</div>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="card card-body space-y-4">
      <h2 class="text-lg font-semibold">İçe ve dışa aktarma</h2>
      <p class="muted">
        Envanterini CSV olarak indir ya da bir CSV dosyasından ürün ekle.
      </p>
      <button
        class="btn-secondary w-fit"
        :disabled="s.saving"
        @click="exportCsv"
      >
        <Download :size="16" />CSV olarak indir
      </button>
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          class="input !w-auto"
          aria-label="İçe aktarılacak CSV"
          @change="pick"
        />
        <button
          class="btn-secondary"
          :disabled="s.saving || !importFile"
          @click="importCsv"
        >
          <Upload :size="16" />İçe aktar
        </button>
      </div>
    </section>

    <section class="card card-body space-y-4">
      <h2 class="text-lg font-semibold">Bildirimler</h2>
      <p class="muted">
        Bakım ve garanti hatırlatmalarını Shoutrrr bağlantısıyla gönder.
      </p>
      <p v-if="notifierNote" class="muted">{{ notifierNote }}</p>
      <ul
        v-else-if="notifiers.length"
        class="divide-y divide-gray-200 dark:divide-neutral-700"
      >
        <li
          v-for="n in notifiers"
          :key="n.id"
          class="flex items-center justify-between gap-3 py-2"
        >
          <span class="flex min-w-0 items-center gap-2"
            ><Bell :size="16" /><span class="truncate text-sm">{{
              n.name
            }}</span
            ><span :class="n.isActive ? 'badge-green' : 'badge'">{{
              n.isActive ? "Açık" : "Kapalı"
            }}</span></span
          >
          <span class="flex shrink-0 gap-1">
            <button
              class="btn-secondary !px-3 !py-1.5"
              @click="toggleNotifier(n)"
            >
              {{ n.isActive ? "Kapat" : "Aç" }}
            </button>
            <button
              class="icon-button"
              :aria-label="n.name + ' bildirimini sil'"
              @click="removeNotifier(n)"
            >
              <Trash2 :size="16" />
            </button>
          </span>
        </li>
      </ul>
      <form class="grid gap-3" @submit.prevent="addNotifier">
        <input
          v-model="notifier.name"
          class="input"
          required
          placeholder="Bildirim adı"
          aria-label="Bildirim adı"
        />
        <input
          v-model="notifier.url"
          class="input"
          required
          placeholder="Bağlantı (ör. ntfy://sunucu/konu)"
          aria-label="Bildirim bağlantısı"
        />
        <div class="flex gap-2">
          <button type="submit" class="btn-primary" :disabled="s.saving">
            Bildirim ekle
          </button>
          <button
            type="button"
            class="btn-secondary"
            :disabled="!notifier.url"
            @click="testNotifier"
          >
            <Send :size="16" />Test gönder
          </button>
        </div>
      </form>
    </section>

    <section class="card card-body lg:col-span-2">
      <h2 class="text-lg font-semibold">Bakım araçları</h2>
      <p class="muted mt-1">
        Toplu düzeltmeler tüm koleksiyonu etkiler. Çalıştırmadan önce yedek
        almanı öneririz.
      </p>
      <ul class="mt-3 divide-y divide-gray-200 dark:divide-neutral-700">
        <li
          v-for="a in actions"
          :key="a.id"
          class="flex flex-wrap items-center justify-between gap-3 py-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium">{{ a.name }}</p>
            <p class="muted">{{ a.note }}</p>
          </div>
          <button
            class="btn-secondary"
            :disabled="s.saving"
            @click="run(a.id, a.name)"
          >
            <LoaderCircle
              v-if="s.saving"
              class="animate-spin"
              :size="16"
            />Çalıştır
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
