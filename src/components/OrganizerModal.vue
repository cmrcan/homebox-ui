<script setup lang="ts">
import { LoaderCircle } from "lucide-vue-next";
import BaseModal from "./BaseModal.vue";
import { close, organizerForm, s, saveOrganizer } from "../store";
</script>

<template>
  <BaseModal
    :title="s.organizerKind === 'locations' ? 'Konum bilgileri' : 'Etiket bilgileri'"
    subtitle="Evinin düzeni"
    @close="close"
  >
    <div v-if="s.error" role="alert" class="alert-error mx-5 mt-4">{{ s.error }}</div>
    <form class="modal-content space-y-5" @submit.prevent="saveOrganizer">
      <label class="field"
        >Ad<input v-model="organizerForm.name" required maxlength="255"
      /></label>
      <label class="field"
        >Açıklama<textarea v-model="organizerForm.description" maxlength="1000" rows="3"
      /></label>
      <label v-if="s.organizerKind === 'locations' && s.mode === 'entities'" class="field"
        >Konum türü<select v-model="organizerForm.entityTypeId" required>
          <option value="" disabled>Konum türü seç</option>
          <option v-for="t in s.types.filter((t) => t.isLocation)" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select></label
      >
      <label v-if="s.organizerKind === 'locations'" class="field"
        >Üst konum<select v-model="organizerForm.parentId">
          <option value="">Üst konum yok</option>
          <option v-for="l in s.locations.filter((l) => l.id !== s.organizer?.id)" :key="l.id" :value="l.id">
            {{ l.name }}
          </option>
        </select></label
      >
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="close">Vazgeç</button>
        <button type="submit" class="btn-primary" :disabled="s.saving">
          <LoaderCircle v-if="s.saving" class="animate-spin" :size="16" />Kaydet
        </button>
      </div>
    </form>
  </BaseModal>
</template>
