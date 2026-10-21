<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowUpRight,
  FileText,
  LoaderCircle,
  Printer,
  Settings2,
  Trash2,
  Upload,
} from "lucide-vue-next";
import BaseModal from "./BaseModal.vue";
import FieldsEditor from "./FieldsEditor.vue";
import ItemMaintenance from "./ItemMaintenance.vue";
import { fieldDisplay } from "../fields";
import type { CustomField } from "../api";
import {
  api,
  applyTypeTemplate,
  close,
  date,
  edit,
  form,
  money,
  photo,
  removeItem,
  s,
  saveItem,
  uploadFile,
} from "../store";

const hasUnlistedParent = computed(() => {
  const parent = s.selected?.parent;
  return !!parent && !s.locations.some((location) => location.id === parent.id);
});
const customFields = () =>
  (s.selected?.fields as CustomField[] | undefined) || [];
</script>

<template>
  <BaseModal
    :title="
      s.modal === 'detail'
        ? s.selected?.name || ''
        : s.selected
          ? 'Ürünü düzenle'
          : 'Yeni bir ürün'
    "
    :subtitle="s.modal === 'detail' ? 'Ürün bilgileri' : 'Envanter kaydı'"
    @close="close"
  >
    <div v-if="s.error" role="alert" class="alert-error mx-5 mt-4">
      {{ s.error }}
    </div>

    <div v-if="s.modal === 'detail' && s.selected" class="modal-content">
      <img
        v-if="photo(s.selected)"
        :src="photo(s.selected)"
        :alt="s.selected.name"
        class="mb-4 max-h-72 w-full rounded-lg object-cover"
      />
      <p class="muted mb-5">
        {{ s.selected.description || "Açıklama eklenmemiş." }}
      </p>
      <div class="detail-grid">
        <div>
          <small>Konum</small
          ><strong>{{
            s.selected.location?.name || s.selected.parent?.name || "—"
          }}</strong>
        </div>
        <div>
          <small>Ürün türü</small
          ><strong>{{ s.selected.entityType?.name || "—" }}</strong>
        </div>
        <div>
          <small>Satın alma değeri</small
          ><strong>{{ money(s.selected.purchasePrice) }}</strong>
        </div>
        <div>
          <small>Marka / Model</small
          ><strong>{{
            [s.selected.manufacturer, s.selected.modelNumber]
              .filter(Boolean)
              .join(" / ") || "—"
          }}</strong>
        </div>
        <div>
          <small>Seri numarası</small
          ><strong>{{ s.selected.serialNumber || "—" }}</strong>
        </div>
        <div>
          <small>Satın alma tarihi</small
          ><strong>{{
            date(s.selected.purchaseDate || s.selected.purchaseTime)
          }}</strong>
        </div>
        <div>
          <small>Garanti bitişi</small
          ><strong>{{
            s.selected.lifetimeWarranty
              ? "Ömür boyu"
              : date(s.selected.warrantyExpires)
          }}</strong>
        </div>
        <div>
          <small>Adet</small><strong>{{ s.selected.quantity }}</strong>
        </div>
        <div class="sm:col-span-2">
          <small>Etiketler</small
          ><strong>{{
            s.selected.tags.map((t) => t.name).join(", ") || "—"
          }}</strong>
        </div>
      </div>

      <section v-if="customFields().length" class="mt-6">
        <h3 class="mb-2 font-semibold">Özel alanlar</h3>
        <dl class="detail-grid">
          <div v-for="(f, i) in customFields()" :key="f.id || i">
            <small>{{ f.name }}</small
            ><strong>{{ fieldDisplay(f) }}</strong>
          </div>
        </dl>
      </section>

      <div v-if="s.selected.notes" class="mt-6">
        <h3 class="mb-2 font-semibold">Notlar</h3>
        <p class="muted whitespace-pre-wrap">{{ s.selected.notes }}</p>
      </div>

      <section class="mt-6">
        <h3 class="font-semibold">Fotoğraflar & belgeler</h3>
        <a
          v-for="a in s.selected.attachments || []"
          :key="a.id"
          :href="api.attachmentUrl(s.selected.id, a.id)"
          target="_blank"
          rel="noopener noreferrer"
          class="attachment-link"
          ><FileText :size="16" /><span>{{ a.title || a.id }}</span
          ><ArrowUpRight :size="14" class="ms-auto"
        /></a>
        <div class="mt-4 flex flex-wrap gap-2">
          <select
            v-model="s.uploadType"
            class="input !w-auto"
            aria-label="Dosya türü"
          >
            <option value="photo">Fotoğraf</option>
            <option value="receipt">Fatura</option>
            <option value="warranty">Garanti</option>
            <option value="manual">Kılavuz</option>
            <option value="attachment">Diğer belge</option>
          </select>
          <label class="btn-secondary cursor-pointer"
            ><Upload :size="16" />Dosya yükle<input
              type="file"
              class="sr-only"
              :disabled="s.saving"
              @change="uploadFile"
          /></label>
          <a
            :href="api.labelUrl(s.selected.id)"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-secondary"
            ><Printer :size="16" />Etiket yazdır</a
          >
        </div>
      </section>

      <ItemMaintenance :item-id="s.selected.id" />

      <div class="modal-actions">
        <button
          v-if="!s.deleteConfirm"
          class="btn-danger"
          @click="s.deleteConfirm = true"
        >
          <Trash2 :size="16" />Sil
        </button>
        <div v-else class="flex flex-wrap items-center gap-2 text-sm">
          <span>Kalıcı olarak silinsin mi?</span>
          <button class="btn-danger" :disabled="s.saving" @click="removeItem">
            Evet, sil
          </button>
          <button class="btn-secondary" @click="s.deleteConfirm = false">
            Vazgeç
          </button>
        </div>
        <button
          class="btn-primary"
          :disabled="s.saving"
          @click="edit(s.selected)"
        >
          <LoaderCircle v-if="s.saving" :size="16" class="animate-spin" />
          <Settings2 v-else :size="16" />Düzenle
        </button>
      </div>
    </div>

    <form
      v-else-if="s.modal === 'edit'"
      class="modal-content"
      @submit.prevent="saveItem"
    >
      <div class="grid grid-cols-2 gap-4">
        <label class="field col-span-2"
          >Ürün adı<input
            v-model="form.name"
            required
            maxlength="255"
            placeholder="Örn. Siemens kahve makinesi"
        /></label>
        <label class="field col-span-2"
          >Açıklama<textarea
            v-model="form.description"
            maxlength="1000"
            rows="2"
            placeholder="Ürünü tanımlayan kısa bir not"
          />
        </label>
        <label v-if="s.mode === 'entities'" class="field"
          >Ürün türü<select
            v-model="form.entityTypeId"
            required
            @change="!s.selected && applyTypeTemplate()"
          >
            <option value="" disabled>Tür seç</option>
            <option
              v-for="t in s.types.filter((t) => !t.isLocation)"
              :key="t.id"
              :value="t.id"
            >
              {{ t.name }}
            </option>
          </select></label
        >
        <label class="field"
          >Adet<input
            v-model.number="form.quantity"
            type="number"
            min="1"
            step="1"
            required
        /></label>
        <label v-if="s.mode === 'legacy'" class="field"
          >Konum<select v-model="form.locationId" required>
            <option v-for="l in s.locations" :key="l.id" :value="l.id">
              {{ l.name }}
            </option>
          </select></label
        >
        <label v-else class="field"
          >Üst konum / ürün<select v-model="form.parentId">
            <option value="">Konum yok</option>
            <option
              v-if="hasUnlistedParent && s.selected?.parent"
              :value="s.selected.parent.id"
            >
              {{ s.selected.parent.name }} (ürün)
            </option>
            <option v-for="l in s.locations" :key="l.id" :value="l.id">
              {{ l.name }}
            </option>
          </select></label
        >
        <label class="field"
          >Satın alma değeri ({{ s.currency }})<input
            v-model.number="form.purchasePrice"
            type="number"
            min="0"
            step="0.01"
            required
        /></label>
        <label class="field"
          >Marka<input v-model="form.manufacturer" maxlength="255"
        /></label>
        <label class="field"
          >Model<input v-model="form.modelNumber" maxlength="255"
        /></label>
        <label class="field"
          >Seri numarası<input v-model="form.serialNumber" maxlength="255"
        /></label>
        <label class="field"
          >Satın alma tarihi<input v-model="form.purchaseDate" type="date"
        /></label>
        <label class="field"
          >Garanti bitişi<input v-model="form.warrantyExpires" type="date"
        /></label>
        <div class="field col-span-2">
          Etiketler
          <div class="mt-2 flex flex-wrap gap-2">
            <label v-for="t in s.tags" :key="t.id" class="tag-check"
              ><input
                v-model="form.tagIds"
                type="checkbox"
                :value="t.id"
                class="sr-only"
              />{{ t.name }}</label
            >
            <span v-if="!s.tags.length" class="muted"
              >Etiketler ekranından bir etiket ekleyebilirsin.</span
            >
          </div>
        </div>
        <FieldsEditor v-model="form.fields" />
        <label class="field col-span-2"
          >Notlar<textarea v-model="form.notes" rows="3" maxlength="1000" />
        </label>
        <label class="col-span-2 flex items-center gap-2 text-sm"
          ><input
            v-model="form.archived"
            type="checkbox"
            class="size-4 rounded border-gray-300 text-blue-600"
          />Arşivlenmiş ürün</label
        >
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="close">
          Vazgeç
        </button>
        <button type="submit" class="btn-primary" :disabled="s.saving">
          <LoaderCircle v-if="s.saving" class="animate-spin" :size="16" />{{
            s.saving ? "Kaydediliyor…" : "Ürünü kaydet"
          }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
