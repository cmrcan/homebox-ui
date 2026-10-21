<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-vue-next";
import BaseModal from "../components/BaseModal.vue";
import type { EntityType, Template } from "../api";
import {
  deleteType,
  flash,
  guarded,
  handleError,
  listTemplates,
  s,
  saveType,
  setTypeTemplate,
  typeTemplate,
} from "../store";

const templates = ref<Template[]>([]);
const editing = ref<EntityType | "new" | null>(null);
const confirmId = ref("");
const form = reactive({ name: "", description: "", isLocation: false });
const mapped = reactive<Record<string, string>>({});

async function load() {
  s.error = "";
  try {
    templates.value = await listTemplates();
  } catch (e) {
    handleError(e);
  }
  for (const t of s.types) mapped[t.id] = typeTemplate(t.id);
}
onMounted(load);

function open(type: EntityType | "new") {
  editing.value = type;
  s.error = "";
  Object.assign(
    form,
    type === "new"
      ? { name: "", description: "", isLocation: false }
      : {
          name: type.name,
          description: type.description || "",
          isLocation: type.isLocation,
        },
  );
}
async function save() {
  const existing =
    editing.value === "new" ? undefined : editing.value || undefined;
  await guarded(async () => {
    await saveType(
      {
        name: form.name.trim(),
        description: form.description,
        isLocation: form.isLocation,
      },
      existing,
    );
    editing.value = null;
    flash("Ürün türü kaydedildi.");
  });
}
async function remove(id: string) {
  await guarded(async () => {
    await deleteType(id);
    confirmId.value = "";
    flash("Ürün türü silindi.");
  });
}
function choose(id: string, templateId: string) {
  setTypeTemplate(id, templateId);
  mapped[id] = templateId;
  flash(
    templateId
      ? "Varsayılan alan şablonu kaydedildi."
      : "Varsayılan şablon kaldırıldı.",
  );
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="muted max-w-2xl">
      Ürün türleri, kayıtlarını gruplamanı sağlar. Bir türe varsayılan alan
      şablonu atarsan, o türde yeni ürün eklerken özel alanlar otomatik gelir.
    </p>
    <button class="btn-primary" @click="open('new')">
      <Plus :size="16" />Tür ekle
    </button>
  </div>
  <div v-if="s.error && !editing" role="alert" class="alert-error mt-4">
    {{ s.error }}
  </div>

  <div class="card mt-4 overflow-x-auto">
    <table class="data-table">
      <thead>
        <tr>
          <th>Tür</th>
          <th>Kapsam</th>
          <th>Varsayılan alan şablonu</th>
          <th class="text-end">İşlemler</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in s.types" :key="t.id">
          <td>
            <strong class="block">{{ t.name }}</strong>
            <small v-if="t.description" class="muted">{{
              t.description
            }}</small>
          </td>
          <td>
            <span class="badge">
              <MapPin v-if="t.isLocation" :size="12" /><Package
                v-else
                :size="12"
              />{{ t.isLocation ? "Konum" : "Ürün" }}
            </span>
          </td>
          <td>
            <select
              v-if="!t.isLocation"
              class="input !w-52"
              :aria-label="t.name + ' varsayılan şablonu'"
              :value="mapped[t.id] || ''"
              @change="choose(t.id, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Şablon yok</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                {{ tpl.name }}
              </option>
            </select>
            <span v-else class="muted">—</span>
          </td>
          <td class="text-end">
            <div
              v-if="confirmId === t.id"
              class="inline-flex items-center gap-2"
            >
              <span class="text-xs">Silinsin mi?</span>
              <button
                class="btn-danger !px-3 !py-1.5"
                :disabled="s.saving"
                @click="remove(t.id)"
              >
                Evet
              </button>
              <button
                class="btn-secondary !px-3 !py-1.5"
                @click="confirmId = ''"
              >
                Vazgeç
              </button>
            </div>
            <template v-else>
              <button
                class="icon-button"
                :aria-label="t.name + ' türünü düzenle'"
                @click="open(t)"
              >
                <Pencil :size="16" />
              </button>
              <button
                class="icon-button"
                :aria-label="t.name + ' türünü sil'"
                @click="confirmId = t.id"
              >
                <Trash2 :size="16" />
              </button>
            </template>
          </td>
        </tr>
        <tr v-if="!s.types.length">
          <td colspan="4" class="muted py-8 text-center">Henüz tür yok.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <BaseModal
    v-if="editing"
    :title="editing === 'new' ? 'Yeni ürün türü' : 'Ürün türünü düzenle'"
    subtitle="Yapılandırma"
    @close="editing = null"
  >
    <div v-if="s.error" role="alert" class="alert-error mx-5 mt-4">
      {{ s.error }}
    </div>
    <form class="modal-content space-y-5" @submit.prevent="save">
      <label class="field"
        >Tür adı<input v-model="form.name" required maxlength="255"
      /></label>
      <label class="field"
        >Açıklama<textarea
          v-model="form.description"
          rows="2"
          maxlength="1000"
        />
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input
          v-model="form.isLocation"
          type="checkbox"
          :disabled="editing !== 'new'"
          class="size-4 rounded border-gray-300 text-blue-600"
        />
        Bu tür bir konum (oda, dolap gibi)
      </label>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="editing = null">
          Vazgeç
        </button>
        <button type="submit" class="btn-primary" :disabled="s.saving">
          <LoaderCircle v-if="s.saving" class="animate-spin" :size="16" />Kaydet
        </button>
      </div>
    </form>
  </BaseModal>
</template>
