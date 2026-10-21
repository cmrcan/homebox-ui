<script setup lang="ts">
import { ref } from "vue";
import { Plus, Trash2, LayoutTemplate } from "lucide-vue-next";
import type { CustomField, FieldType, Template } from "../api";
import { blankField, fieldTypes, mergeTemplateFields } from "../fields";
import { handleError, listTemplates } from "../store";

const fields = defineModel<CustomField[]>({ required: true });
const picker = ref(false);
const templates = ref<Template[]>([]);
const loading = ref(false);

function setType(field: CustomField, type: FieldType) {
  field.type = type;
}
async function togglePicker() {
  picker.value = !picker.value;
  if (!picker.value || templates.value.length) return;
  loading.value = true;
  try {
    templates.value = await listTemplates();
  } catch (e) {
    handleError(e);
    picker.value = false;
  } finally {
    loading.value = false;
  }
}
function apply(template: Template) {
  fields.value = mergeTemplateFields(fields.value, template.fields || []);
  picker.value = false;
}
</script>

<template>
  <fieldset class="sm:col-span-2">
    <legend class="text-sm font-medium text-gray-800 dark:text-white">
      Özel alanlar
    </legend>
    <p class="muted mt-1">
      Bu ürüne özgü ek bilgiler. Ürün türüne bağlı şablonlar bu alanları
      otomatik doldurur.
    </p>
    <div class="mt-3 space-y-3">
      <div
        v-for="(field, index) in fields"
        :key="field.id || index"
        class="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_9rem_1fr_auto] dark:border-neutral-700"
      >
        <input
          v-model="field.name"
          class="input"
          aria-label="Alan adı"
          placeholder="Alan adı"
          maxlength="255"
        />
        <select
          class="input"
          aria-label="Alan türü"
          :value="field.type"
          @change="
            setType(
              field,
              ($event.target as HTMLSelectElement).value as FieldType,
            )
          "
        >
          <option v-for="t in fieldTypes" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
        <input
          v-if="field.type === 'text'"
          v-model="field.textValue"
          class="input"
          aria-label="Alan değeri"
          placeholder="Değer"
          maxlength="500"
        />
        <input
          v-else-if="field.type === 'number'"
          v-model.number="field.numberValue"
          class="input"
          type="number"
          step="any"
          aria-label="Alan değeri"
        />
        <input
          v-else-if="field.type === 'time'"
          v-model="field.timeValue"
          class="input"
          type="date"
          aria-label="Alan değeri"
        />
        <label v-else class="flex items-center gap-2 text-sm">
          <input
            v-model="field.booleanValue"
            type="checkbox"
            class="size-4 rounded border-gray-300 text-blue-600"
          />Evet
        </label>
        <button
          type="button"
          class="icon-button"
          aria-label="Alanı kaldır"
          @click="fields.splice(index, 1)"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="btn-secondary"
        @click="fields.push(blankField())"
      >
        <Plus :size="16" />Alan ekle
      </button>
      <button type="button" class="btn-secondary" @click="togglePicker">
        <LayoutTemplate :size="16" />Şablondan ekle
      </button>
    </div>
    <div
      v-if="picker"
      class="mt-3 rounded-lg border border-gray-200 p-3 dark:border-neutral-700"
    >
      <p v-if="loading" class="muted">Şablonlar yükleniyor…</p>
      <p v-else-if="!templates.length" class="muted">
        Henüz şablon yok. Şablonlar ekranından bir alan şablonu
        oluşturabilirsin.
      </p>
      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="t in templates"
          :key="t.id"
          type="button"
          class="btn-soft"
          @click="apply(t)"
        >
          {{ t.name }}
        </button>
      </div>
    </div>
  </fieldset>
</template>
