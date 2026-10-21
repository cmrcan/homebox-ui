<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { LayoutTemplate, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-vue-next";
import BaseModal from "../components/BaseModal.vue";
import FieldsEditor from "../components/FieldsEditor.vue";
import type { CustomField, Template } from "../api";
import { cleanFields, copyFields } from "../fields";
import {
  api,
  deleteTemplate,
  flash,
  guarded,
  handleError,
  listTemplates,
  s,
  saveTemplate,
} from "../store";

const templates = ref<Template[]>([]);
const loading = ref(true);
const editing = ref<Template | "new" | null>(null);
const confirmId = ref("");
const form = reactive({
  name: "",
  description: "",
  defaultName: "",
  defaultManufacturer: "",
  defaultModelNumber: "",
  defaultQuantity: 1,
  fields: [] as CustomField[],
});

async function load() {
  loading.value = true;
  s.error = "";
  try {
    templates.value = (await listTemplates()) || [];
  } catch (e) {
    handleError(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function open(t: Template | "new") {
  s.error = "";
  let full: Template | null = null;
  if (t !== "new") {
    // The list may omit details; the full record also keeps unedited defaults on save.
    try {
      full = s.demo ? t : await api.template(t.id);
    } catch (e) {
      handleError(e);
      return;
    }
  }
  editing.value = full || "new";
  Object.assign(form, {
    name: full?.name || "",
    description: full?.description || "",
    defaultName: full?.defaultName || "",
    defaultManufacturer: full?.defaultManufacturer || "",
    defaultModelNumber: full?.defaultModelNumber || "",
    defaultQuantity: full?.defaultQuantity ?? 1,
    fields: copyFields(full?.fields),
  });
}
async function save() {
  const existing = editing.value === "new" ? undefined : editing.value || undefined;
  await guarded(async () => {
    await saveTemplate(
      {
        name: form.name.trim(),
        description: form.description,
        defaultName: form.defaultName,
        defaultManufacturer: form.defaultManufacturer,
        defaultModelNumber: form.defaultModelNumber,
        defaultQuantity: form.defaultQuantity,
        fields: cleanFields(form.fields),
      },
      existing,
    );
    editing.value = null;
    flash("Şablon kaydedildi.");
    templates.value = (await listTemplates()) || [];
  });
}
async function remove(id: string) {
  await guarded(async () => {
    await deleteTemplate(id);
    confirmId.value = "";
    templates.value = templates.value.filter((t) => t.id !== id);
    flash("Şablon silindi.");
  });
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="muted max-w-2xl">
      Şablonlar, aynı türdeki ürünler için ortak özel alanları ve varsayılan bilgileri tutar.
      Ürün formunda "Şablondan ekle" ile ya da Ürün türleri ekranından bir türe bağlayarak kullanırsın.
    </p>
    <button class="btn-primary" @click="open('new')"><Plus :size="16" />Şablon ekle</button>
  </div>
  <div v-if="s.error && !editing" role="alert" class="alert-error mt-4">{{ s.error }}</div>

  <div v-if="loading" class="muted flex items-center justify-center gap-2 py-16" role="status">
    <LoaderCircle :size="22" class="animate-spin" />Şablonlar yükleniyor…
  </div>
  <div v-else-if="!templates.length" class="card mt-4 flex flex-col items-center px-6 py-14 text-center">
    <span class="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-800/30 dark:text-blue-400"><LayoutTemplate :size="28" /></span>
    <h3 class="text-lg font-semibold">İlk alan şablonunu oluştur</h3>
    <p class="muted mt-1 mb-5 max-w-sm">Örneğin "Ağ cihazı" şablonuna IP adresi, port sayısı ve PoE alanlarını ekleyebilirsin.</p>
    <button class="btn-primary" @click="open('new')"><Plus :size="16" />Şablon ekle</button>
  </div>
  <section v-else class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <article v-for="t in templates" :key="t.id" class="card card-body flex flex-col">
      <h2 class="text-lg font-semibold">{{ t.name }}</h2>
      <p class="muted mt-1">{{ t.description || "Açıklama yok." }}</p>
      <p v-if="t.fields?.length" class="mt-3 flex flex-wrap gap-1">
        <span v-for="(f, i) in t.fields" :key="f.id || i" class="badge-blue">{{ f.name }}</span>
      </p>
      <div class="mt-auto flex justify-end gap-1 pt-5">
        <div v-if="confirmId === t.id" class="flex items-center gap-2">
          <span class="text-xs">Silinsin mi?</span>
          <button class="btn-danger !px-3 !py-1.5" :disabled="s.saving" @click="remove(t.id)">Evet</button>
          <button class="btn-secondary !px-3 !py-1.5" @click="confirmId = ''">Vazgeç</button>
        </div>
        <template v-else>
          <button class="icon-button" :aria-label="t.name + ' şablonunu düzenle'" @click="open(t)"><Pencil :size="16" /></button>
          <button class="icon-button" :aria-label="t.name + ' şablonunu sil'" @click="confirmId = t.id"><Trash2 :size="16" /></button>
        </template>
      </div>
    </article>
  </section>

  <BaseModal v-if="editing" :title="editing === 'new' ? 'Yeni alan şablonu' : 'Şablonu düzenle'" subtitle="Yapılandırma" @close="editing = null">
    <div v-if="s.error" role="alert" class="alert-error mx-5 mt-4">{{ s.error }}</div>
    <form class="modal-content" @submit.prevent="save">
      <div class="grid grid-cols-2 gap-4">
        <label class="field col-span-2">Şablon adı<input v-model="form.name" required maxlength="255" /></label>
        <label class="field col-span-2">Açıklama<textarea v-model="form.description" rows="2" maxlength="1000" /></label>
        <label class="field col-span-2">Varsayılan ürün adı<input v-model="form.defaultName" maxlength="255" /></label>
        <label class="field">Varsayılan marka<input v-model="form.defaultManufacturer" maxlength="255" /></label>
        <label class="field">Varsayılan model<input v-model="form.defaultModelNumber" maxlength="255" /></label>
        <label class="field">Varsayılan adet<input v-model.number="form.defaultQuantity" type="number" min="1" step="1" /></label>
        <FieldsEditor v-model="form.fields" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="editing = null">Vazgeç</button>
        <button type="submit" class="btn-primary" :disabled="s.saving">
          <LoaderCircle v-if="s.saving" class="animate-spin" :size="16" />Kaydet
        </button>
      </div>
    </form>
  </BaseModal>
</template>
